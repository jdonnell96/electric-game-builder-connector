import { z } from 'zod';
import { defineTool } from '../core/define-tool.js';
import { structured } from '../core/structured.js';
function toMs(seconds) {
    return Math.round(seconds * 100000) / 100;
}
export function computePercentiles(values) {
    if (values.length === 0) {
        return { avg_ms: 0, min_ms: 0, max_ms: 0, p50_ms: 0, p95_ms: 0, p99_ms: 0 };
    }
    const sorted = [...values].sort((a, b) => a - b);
    const sum = sorted.reduce((a, b) => a + b, 0);
    return {
        avg_ms: toMs(sum / sorted.length),
        min_ms: toMs(sorted[0]),
        max_ms: toMs(sorted[sorted.length - 1]),
        p50_ms: toMs(percentile(sorted, 50)),
        p95_ms: toMs(percentile(sorted, 95)),
        p99_ms: toMs(percentile(sorted, 99)),
    };
}
function percentile(sorted, p) {
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper)
        return sorted[lower];
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}
// A spike is a frame over 2x the median, but never under a quarter of the
// frame budget (#371): on an idle game at 240 fps 2x median is ~0.5 ms and
// flags normal jitter, so the spike list was never empty when it should be.
export function spikeThreshold(medianFrameTime, budgetSec) {
    const byMedian = medianFrameTime * 2;
    const byBudget = budgetSec / 4;
    return byMedian >= byBudget
        ? { threshold: byMedian, rule: '2x median' }
        : { threshold: byBudget, rule: 'budget/4 floor' };
}
export function detectSpikes(frames, medianFrameTime, budgetSec = 0) {
    const { threshold } = spikeThreshold(medianFrameTime, budgetSec);
    const spikes = [];
    for (const frame of frames) {
        if (frame.ft > threshold) {
            const spike = {
                frame_index: frame.i,
                frame_time_ms: toMs(frame.ft),
            };
            if (frame.m) {
                spike.monitors = frame.m;
            }
            spikes.push(spike);
        }
    }
    return spikes;
}
export function computeMonitorTrends(frames) {
    const monitorFrames = frames.filter((f) => f.m);
    if (monitorFrames.length === 0)
        return {};
    const allKeys = new Set();
    for (const f of monitorFrames) {
        for (const key of Object.keys(f.m)) {
            allKeys.add(key);
        }
    }
    const trends = {};
    for (const key of allKeys) {
        const values = monitorFrames.filter((f) => f.m[key] !== undefined).map((f) => f.m[key]);
        if (values.length === 0)
            continue;
        const sum = values.reduce((a, b) => a + b, 0);
        const start = values[0];
        const end = values[values.length - 1];
        const changePct = start === 0 ? (end === 0 ? 0 : 100) : ((end - start) / start) * 100;
        trends[key] = {
            start,
            end,
            avg: sum / values.length,
            max: Math.max(...values),
            change_percent: Math.round(changePct * 10) / 10,
        };
    }
    return trends;
}
export function computeFrameBudget(frameTimeStats, targetFps, measuredFps) {
    const budgetMs = 1000 / targetFps;
    const uncappedFps = frameTimeStats.avg_ms > 0 ? Math.round(1000 / frameTimeStats.avg_ms) : 0;
    const budgetUsage = Math.round((frameTimeStats.avg_ms / budgetMs) * 1000) / 10;
    const result = {
        target_fps: targetFps,
        uncapped_fps: uncappedFps,
        frame_budget_ms: Math.round(budgetMs * 10) / 10,
        budget_usage_percent: budgetUsage,
    };
    if (measuredFps !== undefined)
        result.measured_fps = Math.round(measuredFps * 10) / 10;
    return result;
}
const ProfilerSchema = z.discriminatedUnion('action', [
    z.object({ action: z.literal('snapshot').describe('Full performance snapshot (all engine metrics)') }),
    z.object({ action: z.literal('start').describe('Start per-frame time-series profiling') }),
    z.object({ action: z.literal('stop').describe('Stop time-series profiling') }),
    z.object({
        action: z
            .literal('get_data')
            .describe('Get collected time-series data with spike detection. Per-frame detail (percentiles, spikes, monitor trends) covers a ring buffer of the LAST 300 frames only — the `window` field says how much of the run that is; `run` carries whole-run aggregates (frames, duration, avg/max, frames over budget, a frame-time histogram) so a ten-second profile can still answer "did anything spike".'),
    }),
    z.object({
        action: z
            .literal('get_active_processes')
            .describe('List scripts with live _process/_physics_process callbacks across the whole tree — scene, autoloads, and nodes attached by godot_exec — tagged by location.'),
    }),
    z.object({
        action: z.literal('get_signal_connections').describe('Inspect signal connections'),
        node_path: z.string().optional().describe('Node to walk from (default: the whole tree — scene, autoloads and exec-attached nodes). An absolute /root/... path may name an autoload.'),
    }),
]);
export const profiler = defineTool({
    name: 'godot_profiler',
    annotations: { title: 'Profiler', readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    description: 'Profile a running game; every action errors if no game is playing. Use snapshot for one-shot engine metrics, or start → get_data for a per-frame time series with percentile stats, frame-budget usage, spike detection, and monitor trends. get_active_processes lists scripts with live _process/_physics_process callbacks across the whole tree, tagged scene/autoload/exec (useful for finding per-frame cost sources); get_signal_connections maps signal wiring, including an autoload\'s outgoing connections. get_data\'s per-frame detail is a ring of the last 300 frames; its run block covers the whole profile. For observing game state rather than performance, use godot_runtime_state.',
    schema: ProfilerSchema,
    async execute(args, { godot }) {
        switch (args.action) {
            case 'snapshot': {
                const result = await godot.sendCommand('get_performance_metrics');
                return structured(result);
            }
            case 'start': {
                const result = await godot.sendCommand('start_profiler');
                return result.message;
            }
            case 'stop': {
                const result = await godot.sendCommand('stop_profiler');
                return result.message;
            }
            case 'get_data': {
                const result = await godot.sendCommand('get_profiler_data');
                const { frames } = result;
                if (frames.length === 0) {
                    return structured({
                        active: result.active,
                        frame_count: 0,
                        message: 'No frames collected. Start the profiler first with action: start',
                    });
                }
                const frameTimeStats = computePercentiles(frames.map((f) => f.ft));
                const processTimeStats = computePercentiles(frames.map((f) => f.pt));
                const physicsTimeStats = computePercentiles(frames.map((f) => f.pht));
                const monitorTrends = computeMonitorTrends(frames);
                const physicsTickMs = frames.length > 0 ? toMs(frames[0].pft) : 16.67;
                const maxFps = result.max_fps || 0;
                const targetFps = maxFps > 0 ? maxFps : Math.round(1000 / physicsTickMs);
                const budgetSec = 1 / targetFps;
                const { threshold, rule } = spikeThreshold(frameTimeStats.p50_ms / 1000, budgetSec);
                const spikes = detectSpikes(frames, frameTimeStats.p50_ms / 1000, budgetSec);
                const frameBudget = computeFrameBudget(frameTimeStats, targetFps, monitorTrends.fps?.avg);
                // The ring holds the last 300 frames; say how much of the run that is (#370).
                // Entries carry CPU frame time, not wall deltas, so wall span comes from
                // the measured frame rate when the monitor sampled it.
                const measured = monitorTrends.fps?.avg;
                const span = measured && measured > 0
                    ? `~${(result.frame_count / measured).toFixed(2)} s at ${Math.round(measured)} fps`
                    : `${frames.reduce((sum, f) => sum + f.ft, 0).toFixed(2)} s of frame CPU time`;
                const windowNote = result.frame_count < result.total_frames_collected
                    ? `last ${result.frame_count} of ${result.total_frames_collected} frames (${span}) — per-frame detail below covers ONLY this window; see run for the whole profile`
                    : `all ${result.frame_count} frames collected (${span})`;
                const run = result.run
                    ? {
                        frames: result.run.frames,
                        duration_s: Math.round(result.run.duration_s * 100) / 100,
                        avg_ms: result.run.frames > 0 ? toMs(result.run.sum_ft / result.run.frames) : 0,
                        max_ms: toMs(result.run.max_ft),
                        max_frame_index: result.run.max_frame_index,
                        over_budget: result.run.over_budget,
                        over_half_budget: result.run.over_half_budget,
                        histogram_ms: result.run.histogram_ms,
                    }
                    : undefined;
                return structured({
                    active: result.active,
                    window: windowNote,
                    frame_count: result.frame_count,
                    total_frames_collected: result.total_frames_collected,
                    ...(run ? { run } : {}),
                    frame_budget: frameBudget,
                    statistics: {
                        frame_time: frameTimeStats,
                        process_time: processTimeStats,
                        physics_time: physicsTimeStats,
                    },
                    physics_tick_ms: physicsTickMs,
                    spikes: {
                        count: spikes.length,
                        threshold: `>${Math.round(threshold * 1000 * 100) / 100}ms (${rule}; 2x median = ${Math.round(frameTimeStats.p50_ms * 2 * 100) / 100}ms, budget/4 = ${Math.round((budgetSec / 4) * 1000 * 100) / 100}ms)`,
                        frames: spikes.slice(0, 20),
                    },
                    monitor_trends: monitorTrends,
                });
            }
            case 'get_active_processes': {
                const result = await godot.sendCommand('get_active_processes');
                const { processes } = result;
                if (processes.length === 0) {
                    return 'No active _process or _physics_process functions found';
                }
                const lines = [`Active processing scripts (${processes.length} scripts):\n`];
                for (const entry of processes) {
                    const funcs = [];
                    if (entry.has_process)
                        funcs.push('_process');
                    if (entry.has_physics_process)
                        funcs.push('_physics_process');
                    const where = entry.locations?.length ? ` [${entry.locations.join(', ')}]` : '';
                    lines.push(`  ${entry.script_path}${where}`);
                    lines.push(`    Functions: ${funcs.join(', ')}`);
                    lines.push(`    Instances: ${entry.instance_count}`);
                    if (entry.example_paths.length > 0) {
                        lines.push(`    Examples: ${entry.example_paths.join(', ')}`);
                    }
                    lines.push('');
                }
                return lines.join('\n');
            }
            case 'get_signal_connections': {
                const result = await godot.sendCommand('get_signal_connections', { node_path: args.node_path ?? '' });
                const { connections } = result;
                if (connections.length === 0) {
                    return 'No signal connections found';
                }
                const lines = [`Signal connections (${connections.length}):\n`];
                for (const conn of connections) {
                    lines.push(`  ${conn.source_path}.${conn.signal_name} -> ${conn.target_path}.${conn.method_name}`);
                }
                return lines.join('\n');
            }
        }
    },
});
export const profilerTools = [profiler];
//# sourceMappingURL=profiler.js.map
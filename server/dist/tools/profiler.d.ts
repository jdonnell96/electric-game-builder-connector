import { z } from 'zod';
import type { AnyToolDefinition } from '../core/types.js';
interface FrameEntry {
    ft: number;
    pt: number;
    pht: number;
    pft: number;
    i: number;
    m?: Record<string, number>;
}
export interface PercentileStats {
    avg_ms: number;
    min_ms: number;
    max_ms: number;
    p50_ms: number;
    p95_ms: number;
    p99_ms: number;
}
export declare function computePercentiles(values: number[]): PercentileStats;
export interface SpikeInfo {
    frame_index: number;
    frame_time_ms: number;
    monitors?: Record<string, number>;
}
export declare function spikeThreshold(medianFrameTime: number, budgetSec: number): {
    threshold: number;
    rule: string;
};
export declare function detectSpikes(frames: FrameEntry[], medianFrameTime: number, budgetSec?: number): SpikeInfo[];
export interface MonitorTrend {
    start: number;
    end: number;
    avg: number;
    max: number;
    change_percent: number;
}
export declare function computeMonitorTrends(frames: FrameEntry[]): Record<string, MonitorTrend>;
export interface FrameBudget {
    target_fps: number;
    uncapped_fps: number;
    measured_fps?: number;
    frame_budget_ms: number;
    budget_usage_percent: number;
}
export declare function computeFrameBudget(frameTimeStats: PercentileStats, targetFps: number, measuredFps?: number): FrameBudget;
export declare const profiler: import("../core/types.js").ToolDefinition<z.ZodDiscriminatedUnion<[z.ZodObject<{
    action: z.ZodLiteral<"snapshot">;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"start">;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"stop">;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"get_data">;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"get_active_processes">;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"get_signal_connections">;
    node_path: z.ZodOptional<z.ZodString>;
}, z.core.$strip>], "action">>;
export declare const profilerTools: AnyToolDefinition[];
export {};
//# sourceMappingURL=profiler.d.ts.map
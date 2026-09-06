// Pure scoring for eval transcripts — kept side-effect free so it is unit
// testable without spawning anything.
// A spec is 'tool' or 'tool.action'. Tool names arrive from transcripts with
// the client prefix (mcp__godot-mcp__godot_scene) — normalize before matching.
export function normalizeToolName(name) {
    const parts = name.split('__');
    return parts.length >= 3 ? parts.slice(2).join('__') : name;
}
function callKey(call) {
    return call.action ? `${call.tool}.${call.action}` : call.tool;
}
function matchesSpec(call, spec) {
    if (spec.includes('.')) {
        const [tool, action] = spec.split('.');
        return call.tool === tool && call.action === action;
    }
    return call.tool === spec;
}
export function scoreTask(task, calls) {
    const missingRequired = task.required_calls.filter((spec) => !calls.some((call) => matchesSpec(call, spec)));
    const forbiddenHit = task.forbidden_calls.filter((spec) => calls.some((call) => matchesSpec(call, spec)));
    const callCounts = {};
    for (const call of calls) {
        const key = callKey(call);
        callCounts[key] = (callCounts[key] ?? 0) + 1;
    }
    return {
        taskId: task.id,
        passed: missingRequired.length === 0 && forbiddenHit.length === 0,
        missingRequired,
        forbiddenHit,
        totalCalls: calls.length,
        errorCalls: calls.filter((c) => c.isError).length,
        callCounts,
    };
}
//# sourceMappingURL=score.js.map
export interface ToolCall {
    tool: string;
    action?: string;
    isError: boolean;
}
export interface EvalTask {
    id: string;
    requires_game: boolean;
    prompt: string;
    required_calls: string[];
    forbidden_calls: string[];
}
export interface TaskScore {
    taskId: string;
    passed: boolean;
    missingRequired: string[];
    forbiddenHit: string[];
    totalCalls: number;
    errorCalls: number;
    callCounts: Record<string, number>;
}
export declare function normalizeToolName(name: string): string;
export declare function scoreTask(task: EvalTask, calls: ToolCall[]): TaskScore;
//# sourceMappingURL=score.d.ts.map
export declare function logToolUsage(tool: string, args: Record<string, unknown>, success: boolean, durationMs: number, responseBytes: number, errorType?: string, errorCode?: string): void;
export declare function categorizeError(error: unknown): string;
/**
 * Extract the bridge error code (e.g. NOT_RUNNING, INVALID_PARAMS) from a
 * GodotCommandError so the usage log can tell "called at the wrong time"
 * apart from "the tool is broken". Returns undefined for other errors.
 */
export declare function extractErrorCode(error: unknown): string | undefined;
//# sourceMappingURL=usage-logger.d.ts.map
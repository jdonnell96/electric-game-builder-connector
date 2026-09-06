export declare class GodotConnectionError extends Error {
    constructor(message: string);
}
export declare class GodotCommandError extends Error {
    readonly code: string;
    constructor(code: string, message: string);
}
export declare class GodotTimeoutError extends Error {
    constructor(command: string, timeoutMs: number);
}
export declare function formatError(error: unknown): string;
//# sourceMappingURL=errors.d.ts.map
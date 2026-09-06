export class GodotConnectionError extends Error {
    constructor(message) {
        super(message);
        this.name = 'GodotConnectionError';
    }
}
export class GodotCommandError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.name = 'GodotCommandError';
        this.code = code;
    }
}
export class GodotTimeoutError extends Error {
    constructor(command, timeoutMs) {
        super(`Command '${command}' timed out after ${timeoutMs}ms`);
        this.name = 'GodotTimeoutError';
    }
}
export function formatError(error) {
    if (error instanceof GodotCommandError) {
        return `[${error.code}] ${error.message}`;
    }
    if (error instanceof GodotTimeoutError) {
        return `[TIMEOUT] ${error.message}`;
    }
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}
//# sourceMappingURL=errors.js.map
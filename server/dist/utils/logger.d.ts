export declare const logger: {
    debug: (message: string, data?: Record<string, unknown>) => void;
    info: (message: string, data?: Record<string, unknown>) => void;
    notice: (message: string, data?: Record<string, unknown>) => void;
    warning: (message: string, data?: Record<string, unknown>) => void;
    error: (message: string, data?: Record<string, unknown>) => void;
    critical: (message: string, data?: Record<string, unknown>) => void;
    warningRateLimited: (key: string, message: string, data?: Record<string, unknown>) => void;
};
export declare function _resetForTesting(): void;
//# sourceMappingURL=logger.d.ts.map
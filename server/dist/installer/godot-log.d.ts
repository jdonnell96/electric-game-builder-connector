export interface GodotScriptError {
    /** e.g. `Parse Error: Identifier "MCPResourceCommands" not declared in the current scope.` */
    message: string;
    /** `res://...` path from the `at:` line that follows, when present. */
    file?: string;
    line?: number;
}
export interface ParsedGodotLog {
    /** `SCRIPT ERROR:` entries and `Failed to load script` errors, in order. */
    errors: GodotScriptError[];
    /** Other `ERROR:` lines (runtime errors such as a port already in use). Reported, not fatal. */
    otherErrors: string[];
    /** The addon's `_enter_tree` ran to completion. */
    pluginInitialized: boolean;
    /** Godot's version banner, e.g. `4.6.1.stable.official.14d19694e`. */
    engineVersion?: string;
}
export declare function stripAnsi(text: string): string;
export declare function parseGodotLog(text: string): ParsedGodotLog;
export declare function formatScriptError(err: GodotScriptError): string;
//# sourceMappingURL=godot-log.d.ts.map
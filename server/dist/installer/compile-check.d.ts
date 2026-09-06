import { type GodotCandidate } from './godot-locator.js';
import { type GodotScriptError } from './godot-log.js';
export interface CompileCheckOptions {
    /** Explicit path to a Godot executable (`--godot`). */
    godot?: string;
    timeoutMs?: number;
    /** Where the throwaway project and log go. Defaults to the OS temp dir. */
    tmpRoot?: string;
    /** Test hook: candidates to try instead of searching this machine. */
    candidates?: GodotCandidate[];
}
export interface CompileCheckResult {
    status: 'passed' | 'failed' | 'skipped';
    /** One-line summary for the terminal, without the error list. */
    summary: string;
    godot?: {
        path: string;
        source: string;
        version: string;
    };
    durationMs?: number;
    errors: GodotScriptError[];
    otherErrors: string[];
    /** Full Godot output, written on failure so the user can read the rest. */
    logPath?: string;
}
export declare const LOG_FILE_NAME = "godot-mcp-compile-check.log";
export declare function runAddonCompileCheck(installedAddonDir: string, opts?: CompileCheckOptions): Promise<CompileCheckResult>;
export declare function formatCompileCheck(result: CompileCheckResult): string;
export interface WorkingGodot extends GodotCandidate {
    /** `4.6.1` */
    version: string;
    /** What --version printed, e.g. `4.6.1.stable.official.14d19694e` */
    fullVersion: string;
}
/** The first candidate that answers --version as a Godot 4. */
export declare function findWorkingGodot(candidates: GodotCandidate[]): Promise<WorkingGodot | undefined>;
export declare function throwawayProjectFile(port: number): string;
//# sourceMappingURL=compile-check.d.ts.map
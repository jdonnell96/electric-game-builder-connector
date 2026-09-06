import { type GodotCandidate } from '../installer/godot-locator.js';
import { type GodotScriptError } from '../installer/godot-log.js';
export interface TestCheck {
    label: string;
    ok: boolean;
    detail?: string;
}
export interface ParsedTestLog {
    checks: TestCheck[];
    summary?: string;
    errors: GodotScriptError[];
}
export interface TestRunResult {
    /** True only when the exit code was 0, nothing failed, and nothing timed out. */
    ok: boolean;
    passed: number;
    failed: number;
    checks: TestCheck[];
    exit_code: number | null;
    timed_out: boolean;
    duration_ms: number;
    summary?: string;
    /** Godot script errors printed during the run (crashes, parse errors). */
    errors: GodotScriptError[];
    /** The exact command that ran. */
    command: string;
    /** Last lines of output that were not PASS/FAIL, for context. */
    log_tail: string[];
    /** Full output, saved when the run did not pass. */
    log_path?: string;
    /** One line a person can read first. */
    headline: string;
}
export interface RunTestsOptions {
    projectPath: string;
    /** res:// path to a .tscn test scene or a .gd SceneTree script. */
    target: string;
    /** User arguments passed after `--` (e.g. `--test-save`). */
    args?: string[];
    timeoutMs?: number;
    /** Explicit Godot executable. */
    godot?: string;
    /** Test hook. */
    candidates?: GodotCandidate[];
    tmpRoot?: string;
}
export declare const DEFAULT_TEST_TIMEOUT_MS = 180000;
export declare const MAX_TEST_TIMEOUT_MS = 600000;
export declare const LOG_FILE_NAME = "godot-mcp-run-tests.log";
export declare function parseTestLog(text: string): ParsedTestLog;
export declare function buildTestRunResult(input: {
    text: string;
    exitCode: number | null;
    timedOut: boolean;
    durationMs: number;
    command: string;
    timeoutMs: number;
    logPath?: string;
}): TestRunResult;
export declare function formatTestRunResult(result: TestRunResult): string;
export declare function buildGodotTestArgs(projectPath: string, target: string, userArgs: string[]): string[];
export declare function runTests(opts: RunTestsOptions): Promise<TestRunResult>;
//# sourceMappingURL=run-tests.d.ts.map
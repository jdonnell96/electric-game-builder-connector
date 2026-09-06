import { type WorkingGodot } from '../installer/compile-check.js';
import { type GodotCandidate } from '../installer/godot-locator.js';
import { type Finding, type FindingStatus } from './checks.js';
import { type SystemSnapshot } from './system.js';
export interface DoctorOptions {
    /** Godot project to inspect. Falls back to the running editor's --path, then the current directory. */
    projectPath?: string;
    /** Explicit Godot executable. */
    godot?: string;
    skipCompileCheck?: boolean;
    bridgePort?: number;
    cwd?: string;
    /** Test hooks. */
    snapshot?: SystemSnapshot;
    godotCandidates?: GodotCandidate[];
    serverVersion?: string;
    platform?: NodeJS.Platform;
    env?: NodeJS.ProcessEnv;
    home?: string;
}
export type ProjectSource = 'argument' | 'connected server' | 'running editor' | 'current directory';
export interface DoctorReport {
    serverVersion: string;
    node: string;
    platform: NodeJS.Platform;
    takenAt: string;
    project?: {
        path: string;
        source: ProjectSource;
    };
    godot?: WorkingGodot;
    findings: Finding[];
    summary: Record<FindingStatus, number>;
    /** 1 when anything failed. */
    exitCode: number;
}
export declare function runDoctor(opts?: DoctorOptions): Promise<DoctorReport>;
export declare function formatDoctorReport(report: DoctorReport): string;
/**
 * One paragraph to append to a bridge timeout. When a foreign process sits on
 * the debugger port it says so by PID, because that is the cause nine times
 * out of ten and nothing in the editor reports it. Cached briefly: a burst of
 * timeouts should not fork PowerShell for each one.
 */
export declare function timeoutHint(snapshot?: SystemSnapshot): Promise<string>;
//# sourceMappingURL=run.d.ts.map
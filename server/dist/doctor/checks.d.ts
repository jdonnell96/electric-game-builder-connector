import { type WorkingGodot } from '../installer/compile-check.js';
import { type ProcessInfo, type SystemSnapshot } from './system.js';
export type FindingStatus = 'ok' | 'warn' | 'fail' | 'skip';
export interface Finding {
    id: string;
    status: FindingStatus;
    title: string;
    detail?: string[];
    fix?: string[];
}
/** Godot's remote debugger port: the editor listens, the running game is its one peer. */
export declare const DEBUG_PORT = 6007;
/** The addon's WebSocket port for MCP servers. */
export declare const DEFAULT_BRIDGE_PORT = 6550;
export declare function isGodotProcess(p: ProcessInfo): boolean;
/** A game the editor launched: it carries the editor's debug endpoint on its command line. */
export declare function isGodotGame(p: ProcessInfo): boolean;
export declare function isGodotEditor(p: ProcessInfo): boolean;
export declare function projectPathFromCommandLine(commandLine: string): string | undefined;
/** A godot-mcp server process: the npm package or a source checkout of it. Not the npx launcher. */
export declare function isOurServer(p: ProcessInfo): boolean;
/** The package (or checkout) directory a running godot-mcp server was started from. */
export declare function serverPackageDir(p: ProcessInfo): string | undefined;
/** Other Godot tooling (LSP/DAP bridges, other MCP servers) that may sit on Godot's ports. */
export declare function isOtherGodotTool(p: ProcessInfo): boolean;
export declare function checkNodeVersion(version?: string): Finding;
export declare function checkServerBuild(serverVersion: string): Finding;
export declare function checkGodotBinary(godot: WorkingGodot | undefined, explicit?: string): Finding;
export interface EditorSummary {
    finding: Finding;
    editors: ProcessInfo[];
}
export declare function checkEditors(snapshot: SystemSnapshot): EditorSummary;
export interface DebugPortSummary {
    finding: Finding;
    foreignPids: number[];
}
export declare function checkDebugPort(snapshot: SystemSnapshot, port?: number): DebugPortSummary;
export interface BridgePortSummary {
    finding: Finding;
    /** Extra findings about the connected server (damaged package copy, version skew). */
    extra: Finding[];
    holderPid: number | null;
}
export declare function checkBridgePort(snapshot: SystemSnapshot, serverVersion: string, port?: number): BridgePortSummary;
export declare function checkServerProcesses(snapshot: SystemSnapshot, holderPid: number | null, excludePids?: number[]): Finding[];
export interface ProjectSummary {
    findings: Finding[];
    addonDir?: string;
    addonVersion?: string;
}
export declare function checkProject(projectPath: string, serverVersion: string, bundledAddonDir?: string): ProjectSummary;
export declare function checkAddonCompile(addonDir: string, godot: WorkingGodot): Promise<Finding>;
/** `4.6.1.stable.official.14d19694e` -> `4.6.1.stable`, the export-templates folder name. */
export declare function templateVersionDir(fullVersion: string): string | undefined;
export declare function exportTemplatesRoot(platform: NodeJS.Platform, env?: NodeJS.ProcessEnv, home?: string): string;
export declare function checkExportTemplates(fullVersion: string, platform?: NodeJS.Platform, env?: NodeJS.ProcessEnv, home?: string): Finding;
//# sourceMappingURL=checks.d.ts.map
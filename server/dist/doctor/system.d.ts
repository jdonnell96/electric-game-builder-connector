export interface TcpConnection {
    localAddress: string;
    localPort: number;
    remoteAddress: string;
    remotePort: number;
    /** Normalized: 'listen', 'established', or the platform's own word in lower case. */
    state: string;
    pid: number | null;
}
export interface ProcessInfo {
    pid: number;
    ppid: number | null;
    name: string;
    commandLine: string;
}
export interface SystemSnapshot {
    platform: NodeJS.Platform;
    takenAt: string;
    connections: TcpConnection[];
    processes: ProcessInfo[];
    /** Enumeration problems, so a check can say "could not look" instead of "all clear". */
    errors: string[];
}
export declare function takeSystemSnapshot(platform?: NodeJS.Platform): Promise<SystemSnapshot>;
export declare function parseWindowsSnapshot(json: string): Pick<SystemSnapshot, 'connections' | 'processes'>;
export declare function parseSsOutput(text: string): TcpConnection[];
export declare function parseLsofOutput(text: string): TcpConnection[];
export declare function parsePsOutput(text: string): ProcessInfo[];
export declare function findProcess(snapshot: SystemSnapshot, pid: number | null | undefined): ProcessInfo | undefined;
/** The process on the other end of an established connection, when it is on this machine. */
export declare function peerOf(snapshot: SystemSnapshot, conn: TcpConnection): ProcessInfo | undefined;
export declare function ancestors(snapshot: SystemSnapshot, pid: number, limit?: number): ProcessInfo[];
/** One line a person can act on: pid, image name, and the command line trimmed. */
export declare function describeProcess(p: ProcessInfo, maxLength?: number): string;
//# sourceMappingURL=system.d.ts.map
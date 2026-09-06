import type { ProcessInfo, SystemSnapshot, TcpConnection } from '../../doctor/system.js';
export declare const EDITOR_PID = 16448;
export declare const LSP_PID = 5596;
export declare const SERVER_PID = 5284;
export declare const NPX_PID = 18836;
export declare const GAME_PID = 777;
export declare const EDITOR_CMD = "C:\\Users\\jackd\\Downloads\\Godot_v4.6.1\\Godot_v4.6.1-stable_win64.exe --path C:/Users/jackd/Documents/mc-daniels-burgers -e res://scenes/game.tscn";
export declare function conn(localPort: number, remotePort: number, state: 'listen' | 'established', pid: number): TcpConnection;
export declare function proc(pid: number, ppid: number, name: string, commandLine: string): ProcessInfo;
export declare function machineSnapshot(overrides?: Partial<SystemSnapshot>): SystemSnapshot;
/** The same machine with the LSP bridge gone and a game the editor launched attached to 6007. */
export declare function healthySnapshotWithGame(): SystemSnapshot;
export declare function emptySnapshot(): SystemSnapshot;
//# sourceMappingURL=fixtures.d.ts.map
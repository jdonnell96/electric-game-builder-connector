import type { ProcessInfo, SystemSnapshot, TcpConnection } from '../../doctor/system.js';

// This is jackd's machine on 2026-09-03, verbatim from Get-NetTCPConnection:
// the McDaniels editor listening on 6005/6006/6007/6550, a language-server
// bridge (godot-mcp-lsp) attached to the debugger port with no game running,
// and one godot-mcp server holding the bridge. Every 6007/6550 test starts here.

export const EDITOR_PID = 16448;
export const LSP_PID = 5596;
export const SERVER_PID = 5284;
export const NPX_PID = 18836;
export const GAME_PID = 777;

export const EDITOR_CMD =
  'C:\\Users\\jackd\\Downloads\\Godot_v4.6.1\\Godot_v4.6.1-stable_win64.exe --path C:/Users/jackd/Documents/mc-daniels-burgers -e res://scenes/game.tscn';

export function conn(
  localPort: number,
  remotePort: number,
  state: 'listen' | 'established',
  pid: number,
): TcpConnection {
  return { localAddress: '127.0.0.1', localPort, remoteAddress: state === 'listen' ? '0.0.0.0' : '127.0.0.1', remotePort, state, pid };
}

export function proc(pid: number, ppid: number, name: string, commandLine: string): ProcessInfo {
  return { pid, ppid, name, commandLine };
}

export function machineSnapshot(overrides: Partial<SystemSnapshot> = {}): SystemSnapshot {
  return {
    platform: 'win32',
    takenAt: '2026-09-03T21:30:00.000Z',
    errors: [],
    connections: [
      conn(51628, 6007, 'established', LSP_PID),
      conn(50674, 6550, 'established', SERVER_PID),
      conn(6550, 50674, 'established', EDITOR_PID),
      conn(6550, 0, 'listen', EDITOR_PID),
      conn(6007, 0, 'listen', EDITOR_PID),
      conn(6007, 51628, 'established', EDITOR_PID),
      conn(6006, 0, 'listen', EDITOR_PID),
      conn(6005, 0, 'listen', EDITOR_PID),
    ],
    processes: [
      proc(LSP_PID, 9124, 'node.exe', '"C:\\Program Files\\nodejs\\node.exe" C:/Users/jackd/godot-mcp-lsp/dist/index.js'),
      proc(
        SERVER_PID,
        5396,
        'node.exe',
        '"node"   "C:\\Users\\jackd\\Documents\\nowhere\\_npx\\088d4de5374d4e70\\node_modules\\.bin\\\\..\\@satelliteoflove\\godot-mcp\\dist\\cli.js"',
      ),
      proc(EDITOR_PID, 7780, 'Godot_v4.6.1-stable_win64.exe', EDITOR_CMD),
      proc(NPX_PID, 20196, 'node.exe', '"C:\\Program Files\\nodejs\\\\node.exe"  "C:\\Program Files\\nodejs\\\\node_modules\\npm\\bin\\npx-cli.js" -y @satelliteoflove/godot-mcp'),
      proc(9124, 1, 'Claude.exe', 'Claude.exe'),
      proc(5396, NPX_PID, 'cmd.exe', 'cmd.exe /c node cli.js'),
    ],
    ...overrides,
  };
}

/** The same machine with the LSP bridge gone and a game the editor launched attached to 6007. */
export function healthySnapshotWithGame(): SystemSnapshot {
  const base = machineSnapshot();
  return {
    ...base,
    connections: [
      ...base.connections.filter((c) => c.pid !== LSP_PID && !(c.localPort === 6007 && c.remotePort === 51628)),
      conn(52000, 6007, 'established', GAME_PID),
      conn(6007, 52000, 'established', EDITOR_PID),
    ],
    processes: [
      ...base.processes.filter((p) => p.pid !== LSP_PID),
      proc(
        GAME_PID,
        EDITOR_PID,
        'Godot_v4.6.1-stable_win64.exe',
        'C:\\Users\\jackd\\Downloads\\Godot_v4.6.1\\Godot_v4.6.1-stable_win64.exe --path C:/Users/jackd/Documents/mc-daniels-burgers --remote-debug tcp://127.0.0.1:6007 --editor-pid 16448 res://scenes/game.tscn',
      ),
    ],
  };
}

export function emptySnapshot(): SystemSnapshot {
  return { platform: 'win32', takenAt: '2026-09-03T21:30:00.000Z', errors: [], connections: [], processes: [] };
}

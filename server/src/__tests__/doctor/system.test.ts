import { describe, it, expect } from 'vitest';
import {
  ancestors,
  describeProcess,
  parseLsofOutput,
  parsePsOutput,
  parseSsOutput,
  parseWindowsSnapshot,
  peerOf,
} from '../../doctor/system.js';
import { EDITOR_PID, LSP_PID, machineSnapshot } from './fixtures.js';

describe('parseWindowsSnapshot', () => {
  it('reads the PowerShell JSON with string states', () => {
    const json = JSON.stringify({
      tcp: [
        { LocalAddress: '127.0.0.1', LocalPort: 6007, RemoteAddress: '0.0.0.0', RemotePort: 0, State: 'Listen', OwningProcess: 16448 },
        { LocalAddress: '127.0.0.1', LocalPort: 51628, RemoteAddress: '127.0.0.1', RemotePort: 6007, State: 'Established', OwningProcess: 5596 },
      ],
      procs: [{ ProcessId: 5596, ParentProcessId: 9124, Name: 'node.exe', CommandLine: 'node index.js' }],
    });
    const parsed = parseWindowsSnapshot(json);
    expect(parsed.connections).toEqual([
      { localAddress: '127.0.0.1', localPort: 6007, remoteAddress: '0.0.0.0', remotePort: 0, state: 'listen', pid: 16448 },
      { localAddress: '127.0.0.1', localPort: 51628, remoteAddress: '127.0.0.1', remotePort: 6007, state: 'established', pid: 5596 },
    ]);
    expect(parsed.processes).toEqual([{ pid: 5596, ppid: 9124, name: 'node.exe', commandLine: 'node index.js' }]);
  });

  it('survives raw control characters inside command lines', () => {
    const json = '{"tcp":[],"procs":[{"ProcessId":7,"ParentProcessId":1,"Name":"x.exe","CommandLine":"x.exe  --flag\ttab"}]}';
    const parsed = parseWindowsSnapshot(json);
    expect(parsed.processes[0].commandLine).toBe('x.exe   --flag tab');
  });

  it('maps numeric states, single objects, and null command lines', () => {
    const json = JSON.stringify({
      tcp: { LocalAddress: '::', LocalPort: 6550, RemoteAddress: '::', RemotePort: 0, State: 2, OwningProcess: 1 },
      procs: { ProcessId: 4, ParentProcessId: 0, Name: 'System', CommandLine: null },
    });
    const parsed = parseWindowsSnapshot(json);
    expect(parsed.connections[0].state).toBe('listen');
    expect(parsed.processes[0].commandLine).toBe('');
  });
});

describe('parseSsOutput', () => {
  it('reads listeners and established sockets with pids', () => {
    const text = [
      'LISTEN 0 4096 127.0.0.1:6007 0.0.0.0:* users:(("godot",pid=123,fd=5))',
      'ESTAB  0 0    127.0.0.1:51628 127.0.0.1:6007 users:(("node",pid=5596,fd=20))',
      'ESTAB  0 0    [::1]:6550 [::1]:50674',
    ].join('\n');
    expect(parseSsOutput(text)).toEqual([
      { localAddress: '127.0.0.1', localPort: 6007, remoteAddress: '0.0.0.0', remotePort: 0, state: 'listen', pid: 123 },
      { localAddress: '127.0.0.1', localPort: 51628, remoteAddress: '127.0.0.1', remotePort: 6007, state: 'established', pid: 5596 },
      { localAddress: '::1', localPort: 6550, remoteAddress: '::1', remotePort: 50674, state: 'established', pid: null },
    ]);
  });
});

describe('parseLsofOutput', () => {
  it('groups field lines into sockets per process', () => {
    const text = ['p123', 'cGodot', 'n127.0.0.1:6007', 'TST=LISTEN', 'n127.0.0.1:6007->127.0.0.1:51628', 'TST=ESTABLISHED', 'p5596', 'cnode', 'n127.0.0.1:51628->127.0.0.1:6007', 'TST=ESTABLISHED', ''].join('\n');
    expect(parseLsofOutput(text)).toEqual([
      { localAddress: '127.0.0.1', localPort: 6007, remoteAddress: '', remotePort: 0, state: 'listen', pid: 123 },
      { localAddress: '127.0.0.1', localPort: 6007, remoteAddress: '127.0.0.1', remotePort: 51628, state: 'established', pid: 123 },
      { localAddress: '127.0.0.1', localPort: 51628, remoteAddress: '127.0.0.1', remotePort: 6007, state: 'established', pid: 5596 },
    ]);
  });
});

describe('parsePsOutput', () => {
  it('reads pid, ppid and the full command line', () => {
    const text = ['  123     1 /usr/bin/godot --path /home/me/game --editor', ' 5596  9124 node /home/me/godot-mcp-lsp/dist/index.js'].join('\n');
    expect(parsePsOutput(text)).toEqual([
      { pid: 123, ppid: 1, name: 'godot', commandLine: '/usr/bin/godot --path /home/me/game --editor' },
      { pid: 5596, ppid: 9124, name: 'node', commandLine: 'node /home/me/godot-mcp-lsp/dist/index.js' },
    ]);
  });
});

describe('snapshot helpers', () => {
  it('finds the process on the other end of a socket', () => {
    const snap = machineSnapshot();
    const editorSide = snap.connections.find((c) => c.localPort === 6007 && c.state === 'established')!;
    expect(peerOf(snap, editorSide)?.pid).toBe(LSP_PID);
    const lspSide = snap.connections.find((c) => c.pid === LSP_PID)!;
    expect(peerOf(snap, lspSide)?.pid).toBe(EDITOR_PID);
  });

  it('walks parents and describes a process on one line', () => {
    const snap = machineSnapshot();
    expect(ancestors(snap, LSP_PID).map((p) => p.name)).toEqual(['Claude.exe']);
    expect(describeProcess(snap.processes[0])).toBe('PID 5596  node.exe  "C:\\Program Files\\nodejs\\node.exe" C:/Users/jackd/godot-mcp-lsp/dist/index.js');
    expect(describeProcess({ pid: 1, ppid: null, name: 'Claude.exe', commandLine: 'Claude.exe' })).toBe('PID 1  Claude.exe');
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { formatDoctorReport, runDoctor, timeoutHint } from '../../doctor/run.js';
import { EDITOR_PID, LSP_PID, healthySnapshotWithGame, machineSnapshot, proc } from './fixtures.js';

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'godot-mcp-doctor-run-'));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('runDoctor', () => {
  it('reproduces the diagnosis of this machine: 6007 foreign peer, one server, no Godot found', async () => {
    const project = join(root, 'game');
    mkdirSync(project);
    writeFileSync(join(project, 'project.godot'), 'config_version=5\n');
    const report = await runDoctor({
      snapshot: machineSnapshot(),
      godotCandidates: [],
      projectPath: project,
      serverVersion: '4.1.11',
      platform: 'win32',
      env: {},
      home: root,
    });
    const byId = Object.fromEntries(report.findings.map((f) => [f.id, f.status]));
    expect(byId).toMatchObject({
      node: 'ok',
      godot: 'warn',
      editor: 'ok',
      port_6007: 'fail',
      port_6550: 'ok',
      servers: 'ok',
      addon: 'fail',
    });
    expect(report.findings.map((f) => f.id)).not.toContain('other_tools');
    expect(report.project).toEqual({ path: project, source: 'argument' });
    expect(report.exitCode).toBe(1);
    expect(report.summary.fail).toBe(2);

    const text = formatDoctorReport(report);
    expect(text).toContain(`Project: ${project}  (from argument)`);
    expect(text).toMatch(/^ ?\d+\. FAIL  Port 6007 \(game debugger\) has a foreign peer$/m);
    expect(text).toContain(`Fix: Stop it now: Stop-Process -Id ${LSP_PID}`);
    expect(text).toMatch(/2 problems, \d+ warnings?\. Fix the FAIL items first/);
  });

  it('takes the project from the running editor when none is given', async () => {
    const project = join(root, 'from-editor');
    mkdirSync(project);
    const snapshot = healthySnapshotWithGame();
    snapshot.processes = snapshot.processes.map((p) =>
      p.pid === EDITOR_PID ? { ...p, commandLine: `Godot.exe --path "${project}" --editor` } : p,
    );
    const report = await runDoctor({ snapshot, godotCandidates: [], serverVersion: '4.1.11', platform: 'win32', env: {}, home: root, cwd: root });
    expect(report.project).toEqual({ path: project, source: 'running editor' });
    expect(report.findings.find((f) => f.id === 'port_6007')?.status).toBe('ok');
  });

  it('falls back to the current directory, then to a skip that names the command', async () => {
    writeFileSync(join(root, 'project.godot'), 'config_version=5\n');
    const snapshot = machineSnapshot();
    snapshot.processes = snapshot.processes.map((p) => (p.pid === EDITOR_PID ? { ...p, commandLine: 'Godot.exe --editor' } : p));
    const withCwd = await runDoctor({ snapshot, godotCandidates: [], serverVersion: '4.1.11', platform: 'win32', env: {}, home: root, cwd: root });
    expect(withCwd.project).toEqual({ path: root, source: 'current directory' });

    const empty = join(root, 'empty');
    mkdirSync(empty);
    const none = await runDoctor({ snapshot, godotCandidates: [], serverVersion: '4.1.11', platform: 'win32', env: {}, home: root, cwd: empty });
    expect(none.project).toBeUndefined();
    const skipped = none.findings.find((f) => f.id === 'project');
    expect(skipped?.status).toBe('skip');
    expect(skipped?.fix?.[0]).toContain('--doctor <path-to-project>');
  });

  it('says everything is fine on a healthy machine', async () => {
    const snapshot = healthySnapshotWithGame();
    snapshot.processes = snapshot.processes.map((p) => (p.pid === EDITOR_PID ? { ...p, commandLine: 'Godot.exe --editor' } : p));
    snapshot.processes.push(proc(4242, 1, 'node.exe', 'node other.js'));
    const empty = join(root, 'empty');
    mkdirSync(empty);
    const report = await runDoctor({ snapshot, godotCandidates: [], serverVersion: '4.1.11', platform: 'win32', env: {}, home: root, cwd: empty });
    expect(report.exitCode).toBe(0);
    expect(report.summary.fail).toBe(0);
  });
});

describe('timeoutHint', () => {
  it('names the foreign peer on 6007 when there is one', async () => {
    const hint = await timeoutHint(machineSnapshot());
    expect(hint).toContain('Likely cause: Port 6007 (game debugger) has a foreign peer.');
    expect(hint).toContain(`PID ${LSP_PID}`);
    expect(hint).toContain(`Stop it now: Stop-Process -Id ${LSP_PID}`);
  });

  it('points at doctor otherwise', async () => {
    const hint = await timeoutHint(healthySnapshotWithGame());
    expect(hint).toContain('--doctor');
    expect(hint).not.toContain('Likely cause');
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  checkBridgePort,
  checkDebugPort,
  checkEditors,
  checkExportTemplates,
  checkNodeVersion,
  checkProject,
  checkServerProcesses,
  exportTemplatesRoot,
  isGodotEditor,
  isGodotGame,
  isOtherGodotTool,
  isOurServer,
  projectPathFromCommandLine,
  serverPackageDir,
  templateVersionDir,
} from '../../doctor/checks.js';
import { MANIFEST_FILE, buildManifest } from '../../installer/manifest.js';
import { EDITOR_CMD, EDITOR_PID, GAME_PID, LSP_PID, SERVER_PID, conn, emptySnapshot, healthySnapshotWithGame, machineSnapshot, proc } from './fixtures.js';

describe('process classification', () => {
  const editor = proc(1, 0, 'Godot_v4.6.1-stable_win64.exe', EDITOR_CMD);
  const game = proc(2, 1, 'Godot_v4.6.1-stable_win64.exe', 'Godot.exe --path C:/g --remote-debug tcp://127.0.0.1:6007 --editor-pid 1');
  const headless = proc(3, 0, 'godot', '/usr/bin/godot --headless --editor --path /tmp/x --quit');

  it('tells the editor from the game it launched', () => {
    expect(isGodotEditor(editor)).toBe(true);
    expect(isGodotGame(editor)).toBe(false);
    expect(isGodotGame(game)).toBe(true);
    expect(isGodotEditor(game)).toBe(false);
    expect(isGodotEditor(headless)).toBe(false);
  });

  it('reads the project path off the command line, quoted or not', () => {
    expect(projectPathFromCommandLine(EDITOR_CMD)).toBe('C:/Users/jackd/Documents/mc-daniels-burgers');
    expect(projectPathFromCommandLine('godot --path "C:/My Games/x/" --editor')).toBe('C:/My Games/x');
    expect(projectPathFromCommandLine('godot --editor')).toBeUndefined();
  });

  it('recognises our own server and where it runs from', () => {
    const snap = machineSnapshot();
    const server = snap.processes.find((p) => p.pid === SERVER_PID)!;
    expect(isOurServer(server)).toBe(true);
    expect(serverPackageDir(server)).toMatch(/_npx[\\/]088d4de5374d4e70[\\/]node_modules[\\/]@satelliteoflove[\\/]godot-mcp$/);
    const checkout = proc(9, 0, 'node', 'node C:\\Users\\jackd\\Documents\\godot-mcp-fork\\server\\dist\\cli.js');
    expect(isOurServer(checkout)).toBe(true);
    expect(serverPackageDir(checkout)).toMatch(/godot-mcp-fork[\\/]server$/);
    expect(isOurServer(snap.processes.find((p) => p.pid === LSP_PID)!)).toBe(false);
  });

  it('flags other Godot tooling but not the npx launcher', () => {
    const snap = machineSnapshot();
    expect(isOtherGodotTool(snap.processes.find((p) => p.pid === LSP_PID)!)).toBe(true);
    expect(isOtherGodotTool(snap.processes.find((p) => p.pid === SERVER_PID)!)).toBe(false);
    expect(snap.processes.filter(isOtherGodotTool).map((p) => p.pid)).toEqual([LSP_PID]);
  });
});

describe('checkNodeVersion', () => {
  it('accepts 20+ and rejects older', () => {
    expect(checkNodeVersion('v20.17.0').status).toBe('ok');
    expect(checkNodeVersion('v18.20.0').status).toBe('fail');
  });
});

describe('checkEditors', () => {
  it('names the running editor and its project', () => {
    const result = checkEditors(machineSnapshot());
    expect(result.finding.status).toBe('ok');
    expect(result.finding.title).toContain(`PID ${EDITOR_PID}`);
    expect(result.finding.title).toContain('mc-daniels-burgers');
    expect(result.editors.map((e) => e.pid)).toEqual([EDITOR_PID]);
  });

  it('warns when no editor is running, with the fix', () => {
    const result = checkEditors(emptySnapshot());
    expect(result.finding.status).toBe('warn');
    expect(result.finding.fix?.[0]).toContain('Plugins');
  });

  it('warns about several editors', () => {
    const snap = machineSnapshot();
    snap.processes.push(proc(999, 1, 'Godot_v4.6.1-stable_win64.exe', 'Godot.exe --path C:/other --editor'));
    const result = checkEditors(snap);
    expect(result.finding.status).toBe('warn');
    expect(result.finding.detail).toHaveLength(2);
  });
});

describe('checkDebugPort (6007)', () => {
  it('finds the language-server bridge sitting on the debugger port and says how to stop it', () => {
    const result = checkDebugPort(machineSnapshot());
    expect(result.finding.status).toBe('fail');
    expect(result.finding.title).toBe('Port 6007 (game debugger) has a foreign peer');
    expect(result.finding.detail?.[0]).toContain(`PID ${LSP_PID}`);
    expect(result.finding.detail?.[0]).toContain('godot-mcp-lsp');
    expect(result.finding.detail?.[0]).toContain('started by Claude.exe PID 9124');
    expect(result.finding.fix?.[0]).toBe(`Stop it now: Stop-Process -Id ${LSP_PID}`);
    expect(result.finding.fix?.[1]).toContain('6005');
    expect(result.foreignPids).toEqual([LSP_PID]);
  });

  it('accepts the running game as the one legitimate peer', () => {
    const result = checkDebugPort(healthySnapshotWithGame());
    expect(result.finding.status).toBe('ok');
    expect(result.finding.title).toContain(`game attached: PID ${GAME_PID}`);
    expect(result.foreignPids).toEqual([]);
  });

  it('is fine with the editor listening and nobody attached', () => {
    const snap = healthySnapshotWithGame();
    snap.connections = snap.connections.filter((c) => c.pid !== GAME_PID && c.remotePort !== 52000);
    const result = checkDebugPort(snap);
    expect(result.finding.status).toBe('ok');
    expect(result.finding.title).toContain('no game attached');
  });

  it('uses kill on posix', () => {
    const result = checkDebugPort(machineSnapshot({ platform: 'linux' }));
    expect(result.finding.fix?.[0]).toBe(`Stop it now: kill ${LSP_PID}`);
  });

  it('skips with no editor, warns when an editor is not listening, skips on enumeration errors', () => {
    expect(checkDebugPort(emptySnapshot()).finding.status).toBe('skip');
    const snap = machineSnapshot();
    snap.connections = [];
    expect(checkDebugPort(snap).finding.status).toBe('warn');
    expect(checkDebugPort(machineSnapshot({ errors: ['powershell failed'] })).finding.status).toBe('skip');
  });
});

describe('checkBridgePort (6550)', () => {
  it('reports the editor listening and the one connected server by PID', () => {
    const result = checkBridgePort(machineSnapshot(), '4.1.11');
    expect(result.finding.status).toBe('ok');
    expect(result.finding.title).toContain(`editor PID ${EDITOR_PID}`);
    expect(result.finding.title).toContain('one client connected');
    expect(result.finding.detail?.[0]).toContain(`PID ${SERVER_PID}`);
    expect(result.holderPid).toBe(SERVER_PID);
    expect(result.extra).toEqual([]);
  });

  it('fails when the editor runs but nothing listens, naming the plugin toggle', () => {
    const snap = machineSnapshot();
    snap.connections = snap.connections.filter((c) => c.localPort !== 6550 && c.remotePort !== 6550);
    const result = checkBridgePort(snap, '4.1.11');
    expect(result.finding.status).toBe('fail');
    expect(result.finding.fix?.[0]).toContain('Project > Project Settings > Plugins');
  });

  it('skips with no editor and fails when a stranger holds the port', () => {
    expect(checkBridgePort(emptySnapshot(), '4.1.11').finding.status).toBe('skip');
    const snap = emptySnapshot();
    snap.connections.push(conn(6550, 0, 'listen', 42));
    snap.processes.push(proc(42, 1, 'python.exe', 'python server.py'));
    const result = checkBridgePort(snap, '4.1.11');
    expect(result.finding.status).toBe('fail');
    expect(result.finding.title).toContain('PID 42');
  });

  it('warns when two clients are connected', () => {
    const snap = machineSnapshot();
    snap.connections.push(conn(50999, 6550, 'established', 4444), conn(6550, 50999, 'established', EDITOR_PID));
    snap.processes.push(proc(4444, 1, 'node.exe', 'node C:\\x\\godot-mcp\\dist\\cli.js'));
    const result = checkBridgePort(snap, '4.1.11');
    expect(result.finding.status).toBe('warn');
    expect(result.finding.detail).toHaveLength(2);
  });

  describe('the connected server package', () => {
    let root: string;
    beforeEach(() => {
      root = mkdtempSync(join(tmpdir(), 'godot-mcp-doctor-'));
    });
    afterEach(() => {
      rmSync(root, { recursive: true, force: true });
    });

    it('flags a damaged npx cache copy behind the connected server', () => {
      const pkg = join(root, '_npx', 'abc123', 'node_modules', '@satelliteoflove', 'godot-mcp');
      mkdirSync(join(pkg, 'addon', 'commands'), { recursive: true });
      writeFileSync(join(pkg, 'package.json'), '{"version":"4.1.11"}');
      writeFileSync(join(pkg, 'addon', 'commands', 'resource_commands.gd.DELETE.c6a71b9cfc9b6c6aba4c52755aefe22d'), 'old');
      const snap = machineSnapshot();
      snap.processes = snap.processes.map((p) => (p.pid === SERVER_PID ? { ...p, commandLine: `node "${join(pkg, 'dist', 'cli.js')}"` } : p));
      const result = checkBridgePort(snap, '4.1.11');
      expect(result.extra).toHaveLength(1);
      expect(result.extra[0].status).toBe('fail');
      expect(result.extra[0].title).toContain('damaged package copy');
      expect(result.extra[0].detail?.join('\n')).toContain('resource_commands.gd.DELETE');
      expect(result.extra[0].fix?.[0]).toContain('abc123');
    });

    it('notes a version skew between the connected server and this command', () => {
      const pkg = join(root, 'node_modules', '@satelliteoflove', 'godot-mcp');
      mkdirSync(pkg, { recursive: true });
      writeFileSync(join(pkg, 'package.json'), '{"version":"4.1.9"}');
      const snap = machineSnapshot();
      snap.processes = snap.processes.map((p) => (p.pid === SERVER_PID ? { ...p, commandLine: `node "${join(pkg, 'dist', 'cli.js')}"` } : p));
      const result = checkBridgePort(snap, '4.1.11');
      expect(result.extra.map((f) => f.id)).toEqual(['connected_server_version']);
      expect(result.extra[0].title).toContain('4.1.9');
    });
  });
});

describe('checkServerProcesses', () => {
  it('counts one server and lists the language-server bridge as other tooling', () => {
    const findings = checkServerProcesses(machineSnapshot(), SERVER_PID);
    expect(findings.map((f) => [f.id, f.status])).toEqual([
      ['servers', 'ok'],
      ['other_tools', 'warn'],
    ]);
    expect(findings[1].detail?.[0]).toContain('godot-mcp-lsp');
  });

  it('does not repeat a process the 6007 check already named', () => {
    const findings = checkServerProcesses(machineSnapshot(), SERVER_PID, [LSP_PID]);
    expect(findings.map((f) => f.id)).toEqual(['servers']);
  });

  it('warns about duplicate servers and says which to stop', () => {
    const snap = machineSnapshot();
    snap.processes.push(proc(7777, 1, 'node.exe', 'node C:\\x\\@satelliteoflove\\godot-mcp\\dist\\cli.js'));
    const findings = checkServerProcesses(snap, SERVER_PID, [LSP_PID]);
    expect(findings[0].status).toBe('warn');
    expect(findings[0].detail?.find((d) => d.includes('PID 5284'))).toContain('holds the bridge');
    expect(findings[0].detail?.find((d) => d.includes('PID 7777'))).toContain('rejected');
    expect(findings[0].fix).toContain('  Stop-Process -Id 7777');
  });
});

describe('checkProject', () => {
  let root: string;
  let project: string;
  let bundled: string;

  function writeAddon(dir: string, version: string): void {
    mkdirSync(join(dir, 'commands'), { recursive: true });
    writeFileSync(join(dir, 'plugin.cfg'), `[plugin]\nversion="${version}"\n`);
    writeFileSync(join(dir, 'commands', 'resource_commands.gd'), 'class_name MCPResourceCommands\n');
  }

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'godot-mcp-doctor-project-'));
    project = join(root, 'game');
    mkdirSync(project);
    bundled = join(root, 'bundled');
    writeAddon(bundled, '4.1.11');
    writeFileSync(join(bundled, MANIFEST_FILE), JSON.stringify(buildManifest(bundled, '4.1.11')));
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('fails on a folder without project.godot', () => {
    const { findings } = checkProject(project, '4.1.11', bundled);
    expect(findings).toHaveLength(1);
    expect(findings[0].status).toBe('fail');
  });

  it('fails when the addon is missing and gives the install command', () => {
    writeFileSync(join(project, 'project.godot'), 'config_version=5\n');
    const { findings } = checkProject(project, '4.1.11', bundled);
    expect(findings[0].id).toBe('addon');
    expect(findings[0].status).toBe('fail');
    expect(findings[0].fix?.[0]).toContain('--install-addon');
  });

  it('passes a complete, enabled, version-matched addon', () => {
    writeFileSync(
      join(project, 'project.godot'),
      'config_version=5\n\n[autoload]\n\nMCPGameBridge="*res://addons/godot_mcp/game_bridge/mcp_game_bridge.gd"\n\n[editor_plugins]\n\nenabled=PackedStringArray("res://addons/godot_mcp/plugin.cfg")\n',
    );
    writeAddon(join(project, 'addons', 'godot_mcp'), '4.1.11');
    const { findings, addonDir, addonVersion } = checkProject(project, '4.1.11', bundled);
    expect(findings.map((f) => [f.id, f.status])).toEqual([
      ['addon', 'ok'],
      ['addon_files', 'ok'],
      ['plugin_enabled', 'ok'],
      ['autoload', 'ok'],
    ]);
    expect(addonDir).toBe(join(project, 'addons', 'godot_mcp'));
    expect(addonVersion).toBe('4.1.11');
  });

  it('fails on a leftover, a disabled plugin, and warns on a version skew', () => {
    writeFileSync(join(project, 'project.godot'), 'config_version=5\n');
    const addon = join(project, 'addons', 'godot_mcp');
    writeAddon(addon, '4.1.11');
    rmSync(join(addon, 'commands', 'resource_commands.gd'));
    writeFileSync(join(addon, 'commands', 'resource_commands.gd.DELETE.c6a71b9cfc9b6c6aba4c52755aefe22d'), 'old');
    const { findings } = checkProject(project, '4.1.11', bundled);
    const byId = Object.fromEntries(findings.map((f) => [f.id, f]));
    expect(byId.addon_files.status).toBe('fail');
    expect(byId.addon_files.detail).toEqual(['missing: commands/resource_commands.gd', 'leftover: commands/resource_commands.gd.DELETE.c6a71b9cfc9b6c6aba4c52755aefe22d']);
    expect(byId.plugin_enabled.status).toBe('fail');
    expect(byId.autoload).toBeUndefined();

    const skew = checkProject(project, '4.2.0', bundled).findings;
    expect(skew[0].status).toBe('warn');
    expect(skew[0].title).toContain('4.1.11');
    expect(skew[0].title).toContain('4.2.0');
    expect(skew.find((f) => f.id === 'addon_files')?.status).toBe('skip');
  });
});

describe('export templates', () => {
  let home: string;
  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'godot-mcp-doctor-home-'));
  });
  afterEach(() => {
    rmSync(home, { recursive: true, force: true });
  });

  it('derives the folder name and download tag from --version output', () => {
    expect(templateVersionDir('4.6.1.stable.official.14d19694e')).toBe('4.6.1.stable');
    expect(templateVersionDir('4.6.stable.official.abc')).toBe('4.6.stable');
    expect(templateVersionDir('4.7.beta2.official.abc')).toBe('4.7.beta2');
    expect(templateVersionDir('garbage')).toBeUndefined();
  });

  it('knows each platform root', () => {
    expect(exportTemplatesRoot('win32', { APPDATA: 'C:\\Users\\me\\AppData\\Roaming' }, 'C:\\Users\\me')).toBe(join('C:\\Users\\me\\AppData\\Roaming', 'Godot', 'export_templates'));
    expect(exportTemplatesRoot('darwin', {}, '/Users/me')).toBe(join('/Users/me', 'Library', 'Application Support', 'Godot', 'export_templates'));
    expect(exportTemplatesRoot('linux', {}, '/home/me')).toBe(join('/home/me', '.local', 'share', 'godot', 'export_templates'));
  });

  it('warns with the download URL when the templates are absent', () => {
    const finding = checkExportTemplates('4.6.1.stable.official.14d19694e', 'win32', { APPDATA: join(home, 'Roaming') }, home);
    expect(finding.status).toBe('warn');
    expect(finding.fix?.[1]).toContain('https://github.com/godotengine/godot/releases/download/4.6.1-stable/Godot_v4.6.1-stable_export_templates.tpz');
  });

  it('lists the platforms present and missing', () => {
    const dir = join(home, 'Roaming', 'Godot', 'export_templates', '4.6.1.stable');
    mkdirSync(dir, { recursive: true });
    for (const f of ['windows_release_x86_64.exe', 'web_release.zip', 'linux_release.x86_64', 'version.txt']) writeFileSync(join(dir, f), '');
    const finding = checkExportTemplates('4.6.1.stable.official.14d19694e', 'win32', { APPDATA: join(home, 'Roaming') }, home);
    expect(finding.status).toBe('ok');
    expect(finding.title).toBe('Export templates 4.6.1.stable: windows, linux, web (missing: macos, android, ios)');
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { formatCompileCheck, runAddonCompileCheck, throwawayProjectFile } from '../../installer/compile-check.js';
let root;
let addon;
beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'godot-mcp-check-test-'));
    addon = join(root, 'godot_mcp');
    mkdirSync(addon);
    writeFileSync(join(addon, 'plugin.cfg'), '[plugin]\nversion="9.9.9"\ngodot_version_min="4.5"\n');
});
afterEach(() => {
    rmSync(root, { recursive: true, force: true });
});
describe('runAddonCompileCheck', () => {
    it('skips when no candidate answers --version as Godot 4', async () => {
        // node --version prints v20.x, which is not a Godot 4 version string.
        const result = await runAddonCompileCheck(addon, {
            candidates: [{ path: process.execPath, source: 'test' }],
            tmpRoot: root,
        });
        expect(result.status).toBe('skipped');
        expect(result.summary).toContain('no Godot 4 executable found');
        expect(formatCompileCheck(result)).toMatch(/^Compile check: skipped\./);
    });
    it('fails, rather than falling back, when an explicit --godot path is not Godot', async () => {
        const result = await runAddonCompileCheck(addon, {
            godot: process.execPath,
            candidates: [{ path: process.execPath, source: '--godot' }],
            tmpRoot: root,
        });
        expect(result.status).toBe('failed');
        expect(result.summary).toContain(process.execPath);
        expect(result.summary).toContain('--version');
    });
    it('fails when an explicit --godot path does not exist', async () => {
        const missing = join(root, 'nope', 'godot.exe');
        const result = await runAddonCompileCheck(addon, { godot: missing, tmpRoot: root });
        expect(result.status).toBe('failed');
        expect(result.summary).toBe(`--godot ${missing} is not an executable file`);
    });
    it('skips when there are no candidates at all', async () => {
        const result = await runAddonCompileCheck(addon, { candidates: [], tmpRoot: root });
        expect(result.status).toBe('skipped');
    });
});
describe('throwawayProjectFile', () => {
    it('enables the plugin and moves it off the default port', () => {
        const text = throwawayProjectFile(61234);
        expect(text).toContain('enabled=PackedStringArray("res://addons/godot_mcp/plugin.cfg")');
        expect(text).toContain('port_override_enabled=true');
        expect(text).toContain('port_override=61234');
    });
});
describe('formatCompileCheck', () => {
    it('prints a pass with where Godot came from', () => {
        const text = formatCompileCheck({
            status: 'passed',
            summary: 'Godot 4.6.1 loaded the plugin cleanly in 3.6s',
            godot: { path: 'C:\\godot.exe', source: 'PATH', version: '4.6.1' },
            errors: [],
            otherErrors: [],
        });
        expect(text).toBe('Compile check: passed. Godot 4.6.1 loaded the plugin cleanly in 3.6s\n  (C:\\godot.exe, found via PATH)');
    });
    it('prints a failure with every error, its location, and the log path', () => {
        const text = formatCompileCheck({
            status: 'failed',
            summary: 'Godot 4.6.1 could not load the plugin (1 script error)',
            godot: { path: 'C:\\godot.exe', source: 'PATH', version: '4.6.1' },
            errors: [{ message: 'Parse Error: x', file: 'res://addons/godot_mcp/command_router.gd', line: 19 }],
            otherErrors: [],
            logPath: 'C:\\tmp\\godot-mcp-compile-check.log',
        });
        expect(text).toBe([
            'Compile check: FAILED. Godot 4.6.1 could not load the plugin (1 script error)',
            '  Parse Error: x',
            '    at res://addons/godot_mcp/command_router.gd:19',
            '  Full Godot output: C:\\tmp\\godot-mcp-compile-check.log',
            '  (C:\\godot.exe, found via PATH)',
        ].join('\n'));
    });
    it('falls back to runtime errors when the plugin never initialized', () => {
        const text = formatCompileCheck({
            status: 'failed',
            summary: 'Godot 4.6.1 exited without initializing the plugin (exit code 1)',
            errors: [],
            otherErrors: ['Something else went wrong'],
        });
        expect(text).toContain('  Something else went wrong');
    });
});
//# sourceMappingURL=compile-check.test.js.map
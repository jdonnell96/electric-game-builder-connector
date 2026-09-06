import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { findGodotCandidates, scanForGodot } from '../../installer/godot-locator.js';
// Everything here runs as if on Windows so the tests do not depend on the
// host's execute bits: on win32 an existing regular file counts as runnable.
const PLATFORM = 'win32';
let root;
let home;
let env;
function touch(path) {
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, '');
}
beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'godot-mcp-locator-'));
    home = join(root, 'home');
    mkdirSync(home, { recursive: true });
    env = { PATH: '', PATHEXT: '.COM;.EXE;.BAT', LOCALAPPDATA: join(home, 'AppData', 'Local'), ProgramData: join(root, 'ProgramData') };
});
afterEach(() => {
    rmSync(root, { recursive: true, force: true });
});
describe('findGodotCandidates', () => {
    it('finds nothing on an empty machine', () => {
        expect(findGodotCandidates(undefined, { env, platform: PLATFORM, home })).toEqual([]);
    });
    it('puts an explicit path first and names its source', () => {
        const explicit = join(root, 'custom', 'godot.exe');
        touch(explicit);
        const pathDir = join(root, 'bin');
        touch(join(pathDir, 'godot.exe'));
        env.PATH = pathDir;
        const found = findGodotCandidates(explicit, { env, platform: PLATFORM, home });
        expect(found.map((c) => c.source)).toEqual(['--godot', 'PATH']);
        expect(found[0].path).toBe(explicit);
    });
    it('drops an explicit path that does not exist', () => {
        expect(findGodotCandidates(join(root, 'missing.exe'), { env, platform: PLATFORM, home })).toEqual([]);
    });
    it('reads GODOT_BIN before PATH and dedupes the same file', () => {
        const pathDir = join(root, 'bin');
        touch(join(pathDir, 'godot4.exe'));
        env.PATH = pathDir;
        env.GODOT_BIN = join(pathDir, 'godot4.exe');
        const found = findGodotCandidates(undefined, { env, platform: PLATFORM, home });
        expect(found).toEqual([{ path: join(pathDir, 'godot4.exe'), source: 'GODOT_BIN' }]);
    });
    it('looks in the Downloads folder, newest version first', () => {
        touch(join(home, 'Downloads', 'Godot_v4.5.1-stable_win64.exe'));
        touch(join(home, 'Downloads', 'Godot_v4.6.1', 'Godot_v4.6.1-stable_win64.exe'));
        touch(join(home, 'Downloads', 'Godot_v4.6.1', 'Godot_v4.6.1-stable_win64_console.exe'));
        touch(join(home, 'Downloads', 'Godot_v3.5-stable_win64.exe'));
        touch(join(home, 'Downloads', 'Godot_v4.6.1-stable_win64.zip'));
        const found = findGodotCandidates(undefined, { env, platform: PLATFORM, home });
        expect(found.map((c) => c.path)).toEqual([
            join(home, 'Downloads', 'Godot_v4.6.1', 'Godot_v4.6.1-stable_win64.exe'),
            join(home, 'Downloads', 'Godot_v4.6.1', 'Godot_v4.6.1-stable_win64_console.exe'),
            join(home, 'Downloads', 'Godot_v4.5.1-stable_win64.exe'),
        ]);
        expect(found[0].source).toBe('Downloads folder');
    });
    it('knows where Steam and Scoop put it', () => {
        env['ProgramFiles(x86)'] = join(root, 'pfx86');
        const steam = join(root, 'pfx86', 'Steam', 'steamapps', 'common', 'Godot Engine', 'godot.windows.opt.tools.64.exe');
        touch(steam);
        const scoop = join(home, 'scoop', 'shims', 'godot.exe');
        touch(scoop);
        const found = findGodotCandidates(undefined, { env, platform: PLATFORM, home });
        expect(found).toEqual([
            { path: steam, source: 'Steam' },
            { path: scoop, source: 'Scoop' },
        ]);
    });
});
describe('scanForGodot', () => {
    it('looks one folder down anywhere, and deeper only inside Godot-named folders', () => {
        touch(join(root, 'misc', 'godot.exe'));
        touch(join(root, 'misc', 'GodotBuilds', 'godot.exe'));
        touch(join(root, 'misc', 'deeper', 'godot.exe'));
        expect(scanForGodot(root, PLATFORM, 2).sort()).toEqual([join(root, 'misc', 'GodotBuilds', 'godot.exe'), join(root, 'misc', 'godot.exe')].sort());
        expect(scanForGodot(root, PLATFORM, 1)).toEqual([join(root, 'misc', 'godot.exe')]);
    });
    it('returns nothing for a directory that does not exist', () => {
        expect(scanForGodot(join(root, 'nope'), PLATFORM, 2)).toEqual([]);
    });
});
//# sourceMappingURL=godot-locator.test.js.map
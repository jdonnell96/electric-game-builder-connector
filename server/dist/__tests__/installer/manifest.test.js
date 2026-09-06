import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MANIFEST_FILE, buildManifest, hashFile, isDeleteLeftover, normalizeLineEndings, normalizeTreeLineEndings, readManifest, verifyAddonDir, } from '../../installer/manifest.js';
let dir;
beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'godot-mcp-manifest-'));
    mkdirSync(join(dir, 'commands'), { recursive: true });
    writeFileSync(join(dir, 'plugin.cfg'), '[plugin]\nversion="1.2.3"\n');
    writeFileSync(join(dir, 'commands', 'resource_commands.gd'), 'class_name MCPResourceCommands\n');
});
afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
});
describe('isDeleteLeftover', () => {
    it('matches the names node-tar leaves behind on Windows', () => {
        expect(isDeleteLeftover('resource_commands.gd.DELETE.c6a71b9cfc9b6c6aba4c52755aefe22d')).toBe(true);
        expect(isDeleteLeftover('LICENSE.DELETE.17FAF9A189994CAB57B37EF7EF2246A6')).toBe(true);
    });
    it('leaves ordinary names alone', () => {
        expect(isDeleteLeftover('resource_commands.gd')).toBe(false);
        expect(isDeleteLeftover('notes.DELETE.txt')).toBe(false);
        expect(isDeleteLeftover('x.DELETE.abc')).toBe(false);
    });
});
describe('line endings', () => {
    it('hashes CRLF and LF copies of a text file identically', () => {
        writeFileSync(join(dir, 'lf.gd'), 'extends Node\nfunc _ready():\n\tpass\n');
        writeFileSync(join(dir, 'crlf.gd'), 'extends Node\r\nfunc _ready():\r\n\tpass\r\n');
        expect(hashFile(join(dir, 'lf.gd'))).toBe(hashFile(join(dir, 'crlf.gd')));
    });
    it('leaves binary data and lone carriage returns alone', () => {
        const binary = Buffer.from([0x50, 0x4b, 0x00, 0x0d, 0x0a, 0xff]);
        expect(normalizeLineEndings(binary)).toBe(binary);
        const loneCr = Buffer.from('a\rb');
        expect(normalizeLineEndings(loneCr).toString()).toBe('a\rb');
    });
    it('rewrites a tree to LF and counts the files it touched', () => {
        writeFileSync(join(dir, 'commands', 'resource_commands.gd'), 'class_name MCPResourceCommands\r\n');
        expect(normalizeTreeLineEndings(dir)).toBe(1);
        expect(readFileSync(join(dir, 'commands', 'resource_commands.gd'), 'utf-8')).toBe('class_name MCPResourceCommands\n');
        expect(normalizeTreeLineEndings(dir)).toBe(0);
    });
    it('verifies a CRLF install against an LF manifest', () => {
        const manifest = buildManifest(dir, '1.2.3');
        writeFileSync(join(dir, 'commands', 'resource_commands.gd'), 'class_name MCPResourceCommands\r\n');
        expect(verifyAddonDir(dir, manifest).ok).toBe(true);
    });
});
describe('buildManifest', () => {
    it('lists every file with a posix path and a sha1, excluding itself', () => {
        writeFileSync(join(dir, MANIFEST_FILE), '{}');
        const manifest = buildManifest(dir, '1.2.3', new Date('2026-09-03T00:00:00Z'));
        expect(manifest.version).toBe('1.2.3');
        expect(manifest.generated_at).toBe('2026-09-03T00:00:00.000Z');
        expect(Object.keys(manifest.files).sort()).toEqual(['commands/resource_commands.gd', 'plugin.cfg']);
        expect(manifest.files['commands/resource_commands.gd']).toMatch(/^[0-9a-f]{40}$/);
    });
    it('round-trips through readManifest', () => {
        const manifest = buildManifest(dir, '1.2.3');
        writeFileSync(join(dir, MANIFEST_FILE), JSON.stringify(manifest));
        expect(readManifest(dir)).toEqual(manifest);
    });
    it('readManifest returns undefined for a missing or malformed file', () => {
        expect(readManifest(dir)).toBeUndefined();
        writeFileSync(join(dir, MANIFEST_FILE), 'not json');
        expect(readManifest(dir)).toBeUndefined();
        writeFileSync(join(dir, MANIFEST_FILE), '{"version": 3}');
        expect(readManifest(dir)).toBeUndefined();
    });
});
describe('verifyAddonDir', () => {
    it('passes a directory that matches its manifest', () => {
        const manifest = buildManifest(dir, '1.2.3');
        const result = verifyAddonDir(dir, manifest);
        expect(result.ok).toBe(true);
        expect(result.verified).toBe(2);
        expect(result.missing).toEqual([]);
        expect(result.mismatched).toEqual([]);
        expect(result.leftovers).toEqual([]);
    });
    it('reports a missing file and the leftover that replaced it', () => {
        const manifest = buildManifest(dir, '1.2.3');
        rmSync(join(dir, 'commands', 'resource_commands.gd'));
        writeFileSync(join(dir, 'commands', 'resource_commands.gd.DELETE.c6a71b9cfc9b6c6aba4c52755aefe22d'), 'old');
        const result = verifyAddonDir(dir, manifest);
        expect(result.ok).toBe(false);
        expect(result.missing).toEqual(['commands/resource_commands.gd']);
        expect(result.leftovers).toEqual(['commands/resource_commands.gd.DELETE.c6a71b9cfc9b6c6aba4c52755aefe22d']);
        expect(result.verified).toBe(1);
    });
    it('reports a file whose contents changed', () => {
        const manifest = buildManifest(dir, '1.2.3');
        writeFileSync(join(dir, 'plugin.cfg'), '[plugin]\nversion="1.2.3"\nedited=true\n');
        const result = verifyAddonDir(dir, manifest);
        expect(result.ok).toBe(false);
        expect(result.mismatched).toEqual(['plugin.cfg']);
    });
    it('ignores extra files that are not leftovers', () => {
        const manifest = buildManifest(dir, '1.2.3');
        writeFileSync(join(dir, 'commands', 'local_notes.txt'), 'mine');
        expect(verifyAddonDir(dir, manifest).ok).toBe(true);
    });
    it('treats a missing directory as everything missing', () => {
        const manifest = buildManifest(dir, '1.2.3');
        const result = verifyAddonDir(join(dir, 'nope'), manifest);
        expect(result.ok).toBe(false);
        expect(result.missing.length).toBe(2);
    });
});
//# sourceMappingURL=manifest.test.js.map
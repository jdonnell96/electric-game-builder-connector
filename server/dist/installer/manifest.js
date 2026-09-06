import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
// The addon ships with a manifest listing every file and its SHA-1. The build
// writes it (scripts/copy-addon.ts); the installer copies only what the
// manifest names and verifies every byte on both ends. Without it, whatever
// happens to be in the package directory is what lands in the user's project,
// and on Windows that has included half-deleted files (see DELETE_LEFTOVER_RE).
export const MANIFEST_FILE = 'manifest.json';
// node-tar (the extractor behind npm and npx) cannot overwrite a file in
// place on Windows, so it renames the old one to `<name>.DELETE.<32 hex>`
// and unlinks the renamed copy. If that unlink fails, or two `npx` runs race
// on the same cache entry, the leftover stays behind and the new file is
// never written. Reproduced with @satelliteoflove/godot-mcp 4.1.11:
// `commands/resource_commands.gd.DELETE.c6a71b9c...` sat where
// `commands/resource_commands.gd` should have been, and the plugin failed with
// `Identifier "MCPResourceCommands" not declared in the current scope`.
export const DELETE_LEFTOVER_RE = /^(.+)\.DELETE\.[0-9a-f]{32}$/i;
export function isDeleteLeftover(name) {
    return DELETE_LEFTOVER_RE.test(name);
}
/** SHA-1 of the file with CRLF folded to LF, so a Windows checkout and a Linux-built package agree. */
export function hashFile(path) {
    return createHash('sha1').update(normalizeLineEndings(readFileSync(path))).digest('hex');
}
/** CRLF -> LF for text; anything containing a NUL byte is left alone. */
export function normalizeLineEndings(data) {
    if (data.includes(0) || !data.includes(0x0d))
        return data;
    return Buffer.from(data.toString('latin1').replace(/\r\n/g, '\n'), 'latin1');
}
/** Rewrite every text file under `dir` with LF endings. Returns how many changed. */
export function normalizeTreeLineEndings(dir) {
    let changed = 0;
    for (const rel of walkFiles(dir)) {
        const path = join(dir, ...rel.split('/'));
        const original = readFileSync(path);
        const normalized = normalizeLineEndings(original);
        if (normalized !== original) {
            writeFileSync(path, normalized);
            changed++;
        }
    }
    return changed;
}
/** Every regular file under `dir`, as sorted posix-style paths relative to `dir`. */
export function walkFiles(dir) {
    const out = [];
    const visit = (current) => {
        for (const entry of readdirSync(current, { withFileTypes: true })) {
            const full = join(current, entry.name);
            if (entry.isDirectory())
                visit(full);
            else if (entry.isFile())
                out.push(relative(dir, full).split(sep).join('/'));
        }
    };
    visit(dir);
    return out.sort();
}
export function buildManifest(dir, version, now = new Date()) {
    const files = {};
    for (const rel of walkFiles(dir)) {
        if (rel === MANIFEST_FILE)
            continue;
        files[rel] = hashFile(join(dir, ...rel.split('/')));
    }
    return { version, generated_at: now.toISOString(), files };
}
export function readManifest(dir) {
    const path = join(dir, MANIFEST_FILE);
    if (!existsSync(path))
        return undefined;
    try {
        const parsed = JSON.parse(readFileSync(path, 'utf-8'));
        if (typeof parsed.version !== 'string' || typeof parsed.files !== 'object' || parsed.files === null)
            return undefined;
        return { version: parsed.version, generated_at: parsed.generated_at ?? '', files: parsed.files };
    }
    catch {
        return undefined;
    }
}
/** Compare a directory against a manifest. Extra files are ignored; leftovers are reported. */
export function verifyAddonDir(dir, manifest) {
    const result = { ok: false, missing: [], mismatched: [], leftovers: [], verified: 0 };
    for (const [rel, sha] of Object.entries(manifest.files)) {
        const path = join(dir, ...rel.split('/'));
        if (!existsSync(path) || !statSync(path).isFile()) {
            result.missing.push(rel);
        }
        else if (hashFile(path) !== sha) {
            result.mismatched.push(rel);
        }
        else {
            result.verified++;
        }
    }
    if (existsSync(dir)) {
        for (const rel of walkFiles(dir)) {
            if (isDeleteLeftover(rel.split('/').pop() ?? ''))
                result.leftovers.push(rel);
        }
    }
    result.ok = result.missing.length === 0 && result.mismatched.length === 0 && result.leftovers.length === 0;
    return result;
}
//# sourceMappingURL=manifest.js.map
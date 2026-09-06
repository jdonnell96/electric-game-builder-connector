import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
function walkTs(dir, out) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === '__tests__' || entry.name === 'node_modules')
            continue;
        const full = join(dir, entry.name);
        if (entry.isDirectory())
            walkTs(full, out);
        else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts'))
            out.push(full);
    }
}
// Per-file content hashes keyed by path relative to srcDir (posix separators).
export function hashSourceFiles(srcDir) {
    const files = [];
    walkTs(srcDir, files);
    files.sort();
    const out = {};
    for (const f of files) {
        const rel = relative(srcDir, f).split(sep).join('/');
        out[rel] = createHash('sha1').update(readFileSync(f)).digest('hex');
    }
    return out;
}
export function computeSourceHash(srcDir) {
    const perFile = hashSourceFiles(srcDir);
    const h = createHash('sha1');
    for (const [rel, digest] of Object.entries(perFile))
        h.update(`${rel}\0${digest}\n`);
    return h.digest('hex');
}
export function writeBuildInfoObject(version, srcDir, now = new Date()) {
    return {
        version,
        built_at: now.toISOString(),
        source_hash: computeSourceHash(srcDir),
        files: hashSourceFiles(srcDir),
    };
}
// Where this module lives at runtime: <root>/dist/utils or <root>/src/utils.
function moduleDir() {
    return fileURLToPath(new URL('.', import.meta.url));
}
export function checkBuildFreshness(here = moduleDir()) {
    const parent = dirname(here.replace(/[\\/]+$/, ''));
    const parentName = basename(parent);
    if (parentName !== 'dist') {
        return { mode: 'source', stale: false };
    }
    const root = dirname(parent);
    const srcDir = join(root, 'src');
    const infoPath = join(parent, 'build-info.json');
    if (!existsSync(srcDir) || !statSync(srcDir).isDirectory()) {
        return { mode: 'packaged', stale: false, ...(existsSync(infoPath) ? { built_at: readInfo(infoPath)?.built_at } : {}) };
    }
    const info = existsSync(infoPath) ? readInfo(infoPath) : undefined;
    if (!info) {
        return { mode: 'dist', stale: true, reason: 'dist/build-info.json is missing — dist predates the build stamp; run `npm run build` in server/' };
    }
    const current = hashSourceFiles(srcDir);
    const changed = [];
    const built = info.files ?? {};
    for (const [rel, digest] of Object.entries(current)) {
        if (built[rel] !== digest)
            changed.push(rel);
    }
    for (const rel of Object.keys(built)) {
        if (!(rel in current))
            changed.push(`${rel} (removed)`);
    }
    if (changed.length === 0) {
        return { mode: 'dist', built_at: info.built_at, stale: false };
    }
    return {
        mode: 'dist',
        built_at: info.built_at,
        stale: true,
        changed,
        reason: `${changed.length} source file(s) changed since dist was built at ${info.built_at}; run \`npm run build\` in server/ and reconnect`,
    };
}
function readInfo(path) {
    try {
        return JSON.parse(readFileSync(path, 'utf-8'));
    }
    catch {
        return undefined;
    }
}
//# sourceMappingURL=build-info.js.map
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DELETE_LEFTOVER_RE, MANIFEST_FILE, hashFile, readManifest, verifyAddonDir } from './manifest.js';
export function compareVersions(a, b) {
    const partsA = a.split('.').map(Number);
    const partsB = b.split('.').map(Number);
    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
        const numA = partsA[i] || 0;
        const numB = partsB[i] || 0;
        if (numA > numB)
            return 1;
        if (numA < numB)
            return -1;
    }
    return 0;
}
export function defaultBundledAddonDir() {
    const __dirname = fileURLToPath(new URL('.', import.meta.url));
    return join(__dirname, '..', '..', 'addon');
}
export async function installAddon(projectPath, options = {}) {
    const absolutePath = resolve(projectPath);
    if (!existsSync(absolutePath)) {
        return { success: false, message: `Path does not exist: ${absolutePath}` };
    }
    const projectFile = join(absolutePath, 'project.godot');
    if (!existsSync(projectFile)) {
        return { success: false, message: `Not a Godot project: ${absolutePath} (no project.godot found)` };
    }
    const bundledAddon = options.bundledAddonDir ?? defaultBundledAddonDir();
    if (!existsSync(bundledAddon)) {
        return {
            success: false,
            message: 'Addon not found in package. This may be a development install - run "npm run build" first.',
        };
    }
    const bundledVersion = parsePluginVersion(join(bundledAddon, 'plugin.cfg'));
    if (!bundledVersion) {
        return { success: false, message: 'Could not determine bundled addon version' };
    }
    const manifest = readManifest(bundledAddon);
    if (!manifest) {
        return {
            success: false,
            message: `The bundled addon has no ${MANIFEST_FILE}, so its contents cannot be verified. Rebuild the package with "npm run build".`,
        };
    }
    const fileCount = Object.keys(manifest.files).length;
    // Check the package copy before touching the project. A damaged copy must
    // never be installed: that is exactly how a broken addon reached users.
    const bundle = resolveBundleSources(bundledAddon, manifest);
    if (bundle.damaged.length > 0) {
        return { success: false, message: describeDamagedBundle(bundledAddon, bundle.damaged) };
    }
    const addonsDir = join(absolutePath, 'addons');
    const targetDir = join(addonsDir, 'godot_mcp');
    let previousVersion;
    let repaired = [];
    const existingPluginCfg = join(targetDir, 'plugin.cfg');
    if (existsSync(existingPluginCfg)) {
        previousVersion = parsePluginVersion(existingPluginCfg);
        if (previousVersion) {
            const comparison = compareVersions(bundledVersion, previousVersion);
            if (comparison < 0 && !options.force) {
                return {
                    success: true,
                    skipped: true,
                    message: `Addon version ${previousVersion} is newer than bundled version ${bundledVersion}. Use --force to downgrade.`,
                    installedVersion: previousVersion,
                    previousVersion,
                    targetDir,
                };
            }
            if (comparison === 0) {
                const state = verifyAddonDir(targetDir, manifest);
                if (state.ok) {
                    return {
                        success: true,
                        skipped: true,
                        message: `Addon is already up to date (version ${previousVersion}, ${state.verified} files verified)`,
                        installedVersion: previousVersion,
                        previousVersion,
                        targetDir,
                        filesVerified: state.verified,
                    };
                }
                if (state.mismatched.length > 0 && !options.force) {
                    const lines = [
                        `Addon version ${previousVersion} is installed but ${state.mismatched.length} file(s) differ from the package:`,
                        ...state.mismatched.map((f) => `  ${f}`),
                    ];
                    if (state.missing.length > 0) {
                        lines.push(`and ${state.missing.length} file(s) are missing:`, ...state.missing.map((f) => `  ${f}`));
                    }
                    lines.push('Left as-is. Use --force to replace the install with the packaged files.');
                    return {
                        success: true,
                        skipped: true,
                        message: lines.join('\n'),
                        installedVersion: previousVersion,
                        previousVersion,
                        targetDir,
                        filesVerified: state.verified,
                        modified: state.mismatched,
                    };
                }
                repaired = [...state.missing, ...state.leftovers.map((f) => `${f} (removed)`)];
            }
        }
        rmSync(targetDir, { recursive: true, force: true });
    }
    mkdirSync(addonsDir, { recursive: true });
    for (const [rel, source] of bundle.sources) {
        const dest = join(targetDir, ...rel.split('/'));
        mkdirSync(dirname(dest), { recursive: true });
        copyFileSync(source, dest);
    }
    copyFileSync(join(bundledAddon, MANIFEST_FILE), join(targetDir, MANIFEST_FILE));
    const after = verifyAddonDir(targetDir, manifest);
    if (!after.ok) {
        const problems = [
            ...after.missing.map((f) => `${f} (missing)`),
            ...after.mismatched.map((f) => `${f} (contents differ)`),
        ];
        return {
            success: false,
            message: [
                `Copied the addon to ${targetDir} but ${problems.length} file(s) did not verify afterwards:`,
                ...problems.map((p) => `  ${p}`),
                'Check free disk space and antivirus quarantine, then run the install again.',
            ].join('\n'),
            targetDir,
        };
    }
    const result = {
        success: true,
        message: '',
        installedVersion: bundledVersion,
        previousVersion,
        targetDir,
        filesVerified: after.verified,
    };
    if (bundle.recovered.length > 0)
        result.recovered = bundle.recovered;
    if (repaired.length > 0)
        result.repaired = repaired;
    const verified = `${after.verified} of ${fileCount} files verified`;
    if (repaired.length > 0) {
        result.message = `Repaired addon ${bundledVersion} (${verified}). Put back:\n${repaired.map((f) => `  ${f}`).join('\n')}`;
    }
    else if (previousVersion && compareVersions(bundledVersion, previousVersion) < 0) {
        result.message = `Downgraded addon from ${previousVersion} to ${bundledVersion} (forced, ${verified})`;
    }
    else if (previousVersion && compareVersions(bundledVersion, previousVersion) === 0) {
        result.message = `Replaced addon ${bundledVersion} with the packaged files (forced, ${verified})`;
    }
    else if (previousVersion) {
        result.message = `Updated addon from ${previousVersion} to ${bundledVersion} (${verified})`;
    }
    else {
        result.message = `Installed addon version ${bundledVersion} (${verified})`;
    }
    if (bundle.recovered.length > 0) {
        result.message += [
            '',
            `Note: ${bundle.recovered.length} file(s) were missing from the package copy on this machine and were recovered from npm's leftover copies:`,
            ...bundle.recovered.map((f) => `  ${f}`),
        ].join('\n');
    }
    return result;
}
function resolveBundleSources(bundledAddon, manifest) {
    const out = { sources: new Map(), recovered: [], damaged: [] };
    for (const [rel, sha] of Object.entries(manifest.files)) {
        const source = join(bundledAddon, ...rel.split('/'));
        if (existsSync(source) && safeHash(source) === sha) {
            out.sources.set(rel, source);
            continue;
        }
        const leftover = findLeftoverWithHash(source, sha);
        if (leftover) {
            out.sources.set(rel, leftover);
            out.recovered.push(rel);
            continue;
        }
        out.damaged.push(`${rel} (${existsSync(source) ? 'contents differ from the package manifest' : 'missing'})`);
    }
    return out;
}
// A leftover only stands in for the real file when its contents match the
// manifest: node-tar renames the *previous* version's file, so after an
// upgrade the leftover is usually older and must not be used.
function findLeftoverWithHash(source, sha) {
    const dir = dirname(source);
    const base = basename(source);
    if (!existsSync(dir))
        return undefined;
    for (const name of readdirSync(dir)) {
        const match = name.match(DELETE_LEFTOVER_RE);
        if (!match || match[1] !== base)
            continue;
        const path = join(dir, name);
        if (safeHash(path) === sha)
            return path;
    }
    return undefined;
}
function safeHash(path) {
    try {
        return hashFile(path);
    }
    catch {
        return undefined;
    }
}
/** The `_npx/<hash>` cache entry a package path sits in, if any. */
export function findNpxCacheEntry(path) {
    const parts = resolve(path).split(sep);
    const index = parts.lastIndexOf('_npx');
    if (index < 0 || index + 1 >= parts.length)
        return undefined;
    return parts.slice(0, index + 2).join(sep);
}
export function describeDamagedBundle(bundledAddon, damaged) {
    const lines = [
        `The godot-mcp package copy on this machine is damaged: ${damaged.length} addon file(s) cannot be installed.`,
        ...damaged.map((d) => `  ${d}`),
        'This happens when npm\'s extraction is interrupted on Windows; a "<file>.DELETE.<hash>" leftover next to the missing file is the sign.',
    ];
    const cacheEntry = findNpxCacheEntry(bundledAddon);
    if (cacheEntry) {
        lines.push(`Fix: delete ${cacheEntry} and run the command again. npx will download a clean copy.`);
    }
    else {
        lines.push('Fix: reinstall the package (for npx, delete its entry under npm-cache/_npx) and run the command again.');
    }
    lines.push('Nothing was written to the project.');
    return lines.join('\n');
}
function parsePluginVersion(pluginCfgPath) {
    try {
        const content = readFileSync(pluginCfgPath, 'utf-8');
        const match = content.match(/^version="([^"]+)"/m);
        return match?.[1];
    }
    catch {
        return undefined;
    }
}
//# sourceMappingURL=install.js.map
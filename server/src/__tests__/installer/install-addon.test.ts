import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describeDamagedBundle, findNpxCacheEntry, installAddon } from '../../installer/install.js';
import { MANIFEST_FILE, buildManifest } from '../../installer/manifest.js';

const LEFTOVER = 'resource_commands.gd.DELETE.c6a71b9cfc9b6c6aba4c52755aefe22d';
const REAL = 'class_name MCPResourceCommands\n';

let root: string;
let bundle: string;
let project: string;

function writeBundle(dir: string, version: string): void {
  mkdirSync(join(dir, 'commands'), { recursive: true });
  writeFileSync(join(dir, 'plugin.cfg'), `[plugin]\nname="Godot MCP"\nversion="${version}"\ngodot_version_min="4.5"\n`);
  writeFileSync(join(dir, 'plugin.gd'), '@tool\nextends EditorPlugin\n');
  writeFileSync(join(dir, 'commands', 'resource_commands.gd'), REAL);
  writeFileSync(join(dir, MANIFEST_FILE), JSON.stringify(buildManifest(dir, version)));
}

function installedFiles(): string[] {
  const dir = join(project, 'addons', 'godot_mcp');
  const out: string[] = [];
  const walk = (d: string, prefix: string): void => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(join(d, entry.name), `${prefix}${entry.name}/`);
      else out.push(prefix + entry.name);
    }
  };
  walk(dir, '');
  return out.sort();
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'godot-mcp-install-'));
  bundle = join(root, 'addon');
  writeBundle(bundle, '9.9.9');
  project = join(root, 'project');
  mkdirSync(project);
  writeFileSync(join(project, 'project.godot'), 'config_version=5\n');
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('installAddon', () => {
  it('copies only the files the manifest names, plus the manifest', async () => {
    writeFileSync(join(bundle, 'commands', 'stray.txt'), 'not in manifest');
    const result = await installAddon(project, { bundledAddonDir: bundle });
    expect(result.success).toBe(true);
    expect(result.skipped).toBeUndefined();
    expect(result.installedVersion).toBe('9.9.9');
    expect(result.filesVerified).toBe(3);
    expect(result.message).toBe('Installed addon version 9.9.9 (3 of 3 files verified)');
    expect(installedFiles()).toEqual(['commands/resource_commands.gd', MANIFEST_FILE, 'plugin.cfg', 'plugin.gd']);
    expect(result.targetDir).toBe(join(project, 'addons', 'godot_mcp'));
  });

  it('refuses a damaged package copy and leaves the project untouched', async () => {
    rmSync(join(bundle, 'commands', 'resource_commands.gd'));
    writeFileSync(join(bundle, 'commands', LEFTOVER), 'older version of the file\n');
    const result = await installAddon(project, { bundledAddonDir: bundle });
    expect(result.success).toBe(false);
    expect(result.message).toContain('damaged');
    expect(result.message).toContain('commands/resource_commands.gd (missing)');
    expect(result.message).toContain('.DELETE.');
    expect(result.message).toContain('Nothing was written to the project.');
    expect(existsSync(join(project, 'addons'))).toBe(false);
  });

  it('recovers a missing file from a leftover whose contents match the manifest', async () => {
    rmSync(join(bundle, 'commands', 'resource_commands.gd'));
    writeFileSync(join(bundle, 'commands', LEFTOVER), REAL);
    const result = await installAddon(project, { bundledAddonDir: bundle });
    expect(result.success).toBe(true);
    expect(result.recovered).toEqual(['commands/resource_commands.gd']);
    expect(result.message).toContain('recovered');
    expect(readFileSync(join(project, 'addons', 'godot_mcp', 'commands', 'resource_commands.gd'), 'utf-8')).toBe(REAL);
    expect(installedFiles()).not.toContain(`commands/${LEFTOVER}`);
  });

  it('refuses a file whose contents differ from the manifest', async () => {
    writeFileSync(join(bundle, 'plugin.gd'), 'tampered');
    const result = await installAddon(project, { bundledAddonDir: bundle });
    expect(result.success).toBe(false);
    expect(result.message).toContain('plugin.gd (contents differ from the package manifest)');
  });

  it('reports an up-to-date install with the number of files verified', async () => {
    await installAddon(project, { bundledAddonDir: bundle });
    const result = await installAddon(project, { bundledAddonDir: bundle });
    expect(result.success).toBe(true);
    expect(result.skipped).toBe(true);
    expect(result.message).toBe('Addon is already up to date (version 9.9.9, 3 files verified)');
    expect(result.targetDir).toBe(join(project, 'addons', 'godot_mcp'));
  });

  it('repairs an existing install of the same version that lost a file', async () => {
    await installAddon(project, { bundledAddonDir: bundle });
    const target = join(project, 'addons', 'godot_mcp');
    rmSync(join(target, 'commands', 'resource_commands.gd'));
    writeFileSync(join(target, 'commands', LEFTOVER), 'stale');
    const result = await installAddon(project, { bundledAddonDir: bundle });
    expect(result.success).toBe(true);
    expect(result.skipped).toBeUndefined();
    expect(result.repaired).toEqual(['commands/resource_commands.gd', `commands/${LEFTOVER} (removed)`]);
    expect(result.message).toMatch(/^Repaired addon 9\.9\.9 \(3 of 3 files verified\)/);
    expect(installedFiles()).toEqual(['commands/resource_commands.gd', MANIFEST_FILE, 'plugin.cfg', 'plugin.gd']);
  });

  it('leaves locally modified files alone unless forced', async () => {
    await installAddon(project, { bundledAddonDir: bundle });
    const edited = join(project, 'addons', 'godot_mcp', 'plugin.gd');
    writeFileSync(edited, '@tool\nextends EditorPlugin\n# my local patch\n');

    const kept = await installAddon(project, { bundledAddonDir: bundle });
    expect(kept.skipped).toBe(true);
    expect(kept.modified).toEqual(['plugin.gd']);
    expect(kept.message).toContain('Use --force');
    expect(readFileSync(edited, 'utf-8')).toContain('my local patch');

    const forced = await installAddon(project, { bundledAddonDir: bundle, force: true });
    expect(forced.skipped).toBeUndefined();
    expect(forced.message).toBe('Replaced addon 9.9.9 with the packaged files (forced, 3 of 3 files verified)');
    expect(readFileSync(edited, 'utf-8')).not.toContain('my local patch');
  });

  it('updates an older install and reports both versions', async () => {
    const old = join(root, 'old-addon');
    writeBundle(old, '9.9.8');
    await installAddon(project, { bundledAddonDir: old });
    const result = await installAddon(project, { bundledAddonDir: bundle });
    expect(result.message).toBe('Updated addon from 9.9.8 to 9.9.9 (3 of 3 files verified)');
  });

  it('will not downgrade without --force', async () => {
    const newer = join(root, 'newer-addon');
    writeBundle(newer, '10.0.0');
    await installAddon(project, { bundledAddonDir: newer });
    const result = await installAddon(project, { bundledAddonDir: bundle });
    expect(result.skipped).toBe(true);
    expect(result.message).toContain('Use --force to downgrade');
    const forced = await installAddon(project, { bundledAddonDir: bundle, force: true });
    expect(forced.message).toBe('Downgraded addon from 10.0.0 to 9.9.9 (forced, 3 of 3 files verified)');
  });

  it('fails clearly when the bundle has no manifest', async () => {
    rmSync(join(bundle, MANIFEST_FILE));
    const result = await installAddon(project, { bundledAddonDir: bundle });
    expect(result.success).toBe(false);
    expect(result.message).toContain(MANIFEST_FILE);
  });

  it('rejects a path that is not a Godot project', async () => {
    const notProject = join(root, 'plain');
    mkdirSync(notProject);
    const result = await installAddon(notProject, { bundledAddonDir: bundle });
    expect(result.success).toBe(false);
    expect(result.message).toContain('Not a Godot project');
  });
});

describe('damaged-bundle guidance', () => {
  it('names the npx cache entry to delete when the package lives in one', () => {
    const inCache = join('C:', 'Users', 'me', 'AppData', 'Local', 'npm-cache', '_npx', '088d4de5374d4e70', 'node_modules', '@satelliteoflove', 'godot-mcp', 'addon');
    expect(findNpxCacheEntry(inCache)).toBe(join('C:', 'Users', 'me', 'AppData', 'Local', 'npm-cache', '_npx', '088d4de5374d4e70'));
    expect(describeDamagedBundle(inCache, ['commands/resource_commands.gd (missing)'])).toContain('Fix: delete ');
  });

  it('falls back to generic advice outside the npx cache', () => {
    expect(findNpxCacheEntry(join('opt', 'godot-mcp', 'addon'))).toBeUndefined();
    expect(describeDamagedBundle(join('opt', 'godot-mcp', 'addon'), ['x (missing)'])).toContain('reinstall the package');
  });
});

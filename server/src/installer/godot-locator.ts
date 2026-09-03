import { accessSync, constants, existsSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';

// Find a Godot 4 executable without asking the user to configure anything.
// Order: an explicit path, then the environment, then PATH, then the places
// installers and downloads usually leave it. Candidates come back in
// preference order; the caller runs `--version` to pick the first that works.

export interface GodotCandidate {
  path: string;
  /** Where it came from, for the install report. */
  source: string;
}

export interface LocatorEnv {
  env?: NodeJS.ProcessEnv;
  platform?: NodeJS.Platform;
  home?: string;
}

const ENV_VARS = ['GODOT_BIN', 'GODOT_PATH', 'GODOT'];
const PATH_NAMES = ['godot4', 'godot', 'Godot'];

export function findGodotCandidates(explicit?: string, opts: LocatorEnv = {}): GodotCandidate[] {
  const env = opts.env ?? process.env;
  const platform = opts.platform ?? process.platform;
  const home = opts.home ?? homedir();
  const out: GodotCandidate[] = [];
  const seen = new Set<string>();
  const add = (path: string | undefined, source: string): void => {
    if (!path) return;
    const resolved = resolveAppBundle(path, platform);
    if (!resolved || seen.has(resolved.toLowerCase())) return;
    if (!isExecutableFile(resolved, platform)) return;
    seen.add(resolved.toLowerCase());
    out.push({ path: resolved, source });
  };

  if (explicit) add(explicit, '--godot');
  for (const name of ENV_VARS) {
    if (env[name]) add(env[name], name);
  }
  for (const hit of whichAll(PATH_NAMES, env, platform)) add(hit, 'PATH');
  for (const { path, source } of wellKnownLocations(platform, env, home)) add(path, source);
  for (const { dir, source } of scanDirectories(platform, env, home)) {
    for (const found of scanForGodot(dir, platform, 2)) add(found, source);
  }
  return out;
}

/** macOS: a `Godot.app` bundle stands in for the binary inside it. */
function resolveAppBundle(path: string, platform: NodeJS.Platform): string | undefined {
  if (platform === 'darwin' && path.endsWith('.app')) {
    const inner = join(path, 'Contents', 'MacOS', 'Godot');
    return existsSync(inner) ? inner : undefined;
  }
  return path;
}

function isExecutableFile(path: string, platform: NodeJS.Platform): boolean {
  try {
    if (!statSync(path).isFile()) return false;
    if (platform !== 'win32') accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function whichAll(names: string[], env: NodeJS.ProcessEnv, platform: NodeJS.Platform): string[] {
  const pathVar = env.PATH ?? env.Path ?? '';
  const dirs = pathVar.split(platform === 'win32' ? ';' : ':').filter(Boolean);
  const exts =
    platform === 'win32'
      ? ['.exe', ...(env.PATHEXT ?? '').split(';').map((e) => e.toLowerCase()).filter((e) => e && e !== '.exe'), '']
      : [''];
  const hits: string[] = [];
  for (const dir of dirs) {
    for (const name of names) {
      for (const ext of exts) {
        const candidate = join(dir, name + ext);
        if (existsSync(candidate)) hits.push(candidate);
      }
    }
  }
  return hits;
}

function wellKnownLocations(platform: NodeJS.Platform, env: NodeJS.ProcessEnv, home: string): GodotCandidate[] {
  if (platform === 'win32') {
    const programFilesX86 = env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)';
    return [
      {
        path: join(programFilesX86, 'Steam', 'steamapps', 'common', 'Godot Engine', 'godot.windows.opt.tools.64.exe'),
        source: 'Steam',
      },
      { path: join(env.ProgramData ?? 'C:\\ProgramData', 'chocolatey', 'bin', 'godot.exe'), source: 'Chocolatey' },
      { path: join(home, 'scoop', 'shims', 'godot.exe'), source: 'Scoop' },
    ];
  }
  if (platform === 'darwin') {
    return [
      { path: '/Applications/Godot.app', source: '/Applications' },
      { path: join(home, 'Applications', 'Godot.app'), source: '~/Applications' },
      { path: '/opt/homebrew/bin/godot', source: 'Homebrew' },
      { path: '/usr/local/bin/godot', source: '/usr/local/bin' },
    ];
  }
  return [
    { path: '/usr/bin/godot', source: '/usr/bin' },
    { path: '/usr/local/bin/godot', source: '/usr/local/bin' },
    { path: join(home, '.local', 'bin', 'godot'), source: '~/.local/bin' },
    { path: '/var/lib/flatpak/exports/bin/org.godotengine.Godot', source: 'Flatpak' },
    { path: join(home, '.local', 'share', 'flatpak', 'exports', 'bin', 'org.godotengine.Godot'), source: 'Flatpak (user)' },
    { path: '/snap/bin/godot', source: 'Snap' },
  ];
}

function scanDirectories(platform: NodeJS.Platform, env: NodeJS.ProcessEnv, home: string): { dir: string; source: string }[] {
  const dirs = [
    { dir: join(home, 'Downloads'), source: 'Downloads folder' },
    { dir: join(home, 'Desktop'), source: 'Desktop' },
  ];
  if (platform === 'win32') {
    const localAppData = env.LOCALAPPDATA ?? join(home, 'AppData', 'Local');
    dirs.push({ dir: join(localAppData, 'Programs'), source: 'per-user Programs folder' });
    dirs.push({ dir: join(localAppData, 'Microsoft', 'WinGet', 'Packages'), source: 'winget' });
    dirs.push({ dir: 'C:\\Godot', source: 'C:\\Godot' });
    dirs.push({ dir: join(env.ProgramFiles ?? 'C:\\Program Files', 'Godot'), source: 'Program Files' });
  } else {
    dirs.push({ dir: join(home, 'Applications'), source: '~/Applications' });
    dirs.push({ dir: '/opt', source: '/opt' });
  }
  return dirs;
}

const NAME_RE = /^godot/i;
const VERSION_IN_NAME_RE = /v?(\d+)\.(\d+)(?:\.(\d+))?/;

/** Shallow scan for files named like a Godot 4 build, newest version first. */
export function scanForGodot(dir: string, platform: NodeJS.Platform, depth: number): string[] {
  const found: string[] = [];
  const visit = (current: string, remaining: number): void => {
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        if (platform === 'darwin' && /^godot.*\.app$/i.test(entry.name)) {
          found.push(full);
        } else if (remaining > 0 && (NAME_RE.test(entry.name) || remaining === depth)) {
          visit(full, remaining - 1);
        }
        continue;
      }
      if (!entry.isFile() || !NAME_RE.test(entry.name)) continue;
      if (platform === 'win32' && !/\.exe$/i.test(entry.name)) continue;
      if (platform !== 'win32' && /\.(zip|sha256|txt|md|tpz|pck|exe|dmg)$/i.test(entry.name)) continue;
      const version = entry.name.match(VERSION_IN_NAME_RE);
      if (version && Number(version[1]) < 4) continue;
      found.push(full);
    }
  };
  visit(dir, depth);
  return found.sort(compareByVersionDesc);
}

function versionKey(path: string): number[] {
  const m = basename(path).match(VERSION_IN_NAME_RE);
  if (!m) return [0, 0, 0];
  return [Number(m[1]), Number(m[2]), Number(m[3] ?? 0)];
}

function compareByVersionDesc(a: string, b: string): number {
  const va = versionKey(a);
  const vb = versionKey(b);
  for (let i = 0; i < 3; i++) {
    if (va[i] !== vb[i]) return vb[i] - va[i];
  }
  // Same version: the windowed build before the console build. Both print
  // fine when piped; the console one pops a window when launched by hand.
  const ca = /console/i.test(basename(a)) ? 1 : 0;
  const cb = /console/i.test(basename(b)) ? 1 : 0;
  return ca - cb || a.localeCompare(b);
}

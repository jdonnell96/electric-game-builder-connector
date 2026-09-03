import { execFile } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { findGodotCandidates, type GodotCandidate } from './godot-locator.js';
import { formatScriptError, parseGodotLog, type GodotScriptError } from './godot-log.js';
import { compareVersions } from './install.js';

// Prove the installed addon compiles before the user opens the editor. A
// throwaway project in the OS temp dir gets a copy of the installed addon with
// the plugin enabled, and a headless editor opens it and quits. The editor
// loads the plugin exactly as the user's editor would, so anything that fails
// there (a missing script, a parse error, a Godot too old for the addon) shows
// up here first, in the terminal, with the file and line.
//
// The user's own project is never opened: opening it headlessly while their
// editor has it open would make two editors fight over `.godot/`. Godot's exit
// code is 0 even when a plugin fails to compile, so the log is the verdict.

const execFileAsync = promisify(execFile);

export interface CompileCheckOptions {
  /** Explicit path to a Godot executable (`--godot`). */
  godot?: string;
  timeoutMs?: number;
  /** Where the throwaway project and log go. Defaults to the OS temp dir. */
  tmpRoot?: string;
  /** Test hook: candidates to try instead of searching this machine. */
  candidates?: GodotCandidate[];
}

export interface CompileCheckResult {
  status: 'passed' | 'failed' | 'skipped';
  /** One-line summary for the terminal, without the error list. */
  summary: string;
  godot?: { path: string; source: string; version: string };
  durationMs?: number;
  errors: GodotScriptError[];
  otherErrors: string[];
  /** Full Godot output, written on failure so the user can read the rest. */
  logPath?: string;
}

export const LOG_FILE_NAME = 'godot-mcp-compile-check.log';
const DEFAULT_TIMEOUT_MS = 120_000;

export async function runAddonCompileCheck(
  installedAddonDir: string,
  opts: CompileCheckOptions = {},
): Promise<CompileCheckResult> {
  const tmpRoot = opts.tmpRoot ?? tmpdir();
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  // An explicit --godot is used alone: silently falling back to some other
  // Godot would hide a typo behind a green result.
  let candidates: GodotCandidate[];
  if (opts.candidates) candidates = opts.candidates;
  else if (opts.godot) candidates = findGodotCandidates(opts.godot).filter((c) => c.source === '--godot');
  else candidates = findGodotCandidates();

  const godot = await pickWorkingGodot(candidates);
  if (!godot) {
    if (opts.godot) {
      return {
        status: 'failed',
        summary:
          candidates.length === 0
            ? `--godot ${opts.godot} is not an executable file`
            : `--godot ${opts.godot} did not answer --version like a Godot 4 executable`,
        errors: [],
        otherErrors: [],
      };
    }
    return {
      status: 'skipped',
      summary:
        'no Godot 4 executable found (looked at GODOT_BIN, GODOT_PATH, PATH, and the usual install folders). Pass --godot <path-to-godot> to run the check.',
      errors: [],
      otherErrors: [],
    };
  }

  const minVersion = parseGodotVersionMin(join(installedAddonDir, 'plugin.cfg'));
  if (minVersion && compareVersions(godot.version, minVersion) < 0) {
    return {
      status: 'failed',
      summary: `Godot ${godot.version} is older than the ${minVersion} the addon requires`,
      godot,
      errors: [],
      otherErrors: [],
    };
  }

  const project = mkdtempSync(join(tmpRoot, 'godot-mcp-check-'));
  const logPath = join(tmpRoot, LOG_FILE_NAME);
  try {
    cpSync(installedAddonDir, join(project, 'addons', 'godot_mcp'), { recursive: true });
    const port = await getFreePort();
    writeFileSync(join(project, 'project.godot'), throwawayProjectFile(port));

    const started = Date.now();
    const output = await runGodot(godot.path, ['--headless', '--editor', '--path', project, '--quit'], timeoutMs);
    const durationMs = Date.now() - started;
    const parsed = parseGodotLog(output.text);

    if (output.timedOut) {
      writeFileSync(logPath, output.text);
      return {
        status: 'failed',
        summary: `Godot ${godot.version} did not finish loading the plugin within ${Math.round(timeoutMs / 1000)}s`,
        godot,
        durationMs,
        errors: parsed.errors,
        otherErrors: parsed.otherErrors,
        logPath,
      };
    }

    if (parsed.errors.length === 0 && parsed.pluginInitialized) {
      return {
        status: 'passed',
        summary: `Godot ${godot.version} loaded the plugin cleanly in ${(durationMs / 1000).toFixed(1)}s`,
        godot,
        durationMs,
        errors: [],
        otherErrors: parsed.otherErrors,
      };
    }

    writeFileSync(logPath, output.text);
    const count = parsed.errors.length;
    return {
      status: 'failed',
      summary:
        count > 0
          ? `Godot ${godot.version} could not load the plugin (${count} script error${count === 1 ? '' : 's'})`
          : `Godot ${godot.version} exited without initializing the plugin (exit code ${output.exitCode ?? 'unknown'})`,
      godot,
      durationMs,
      errors: parsed.errors,
      otherErrors: parsed.otherErrors,
      logPath,
    };
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
}

export function formatCompileCheck(result: CompileCheckResult): string {
  const lines: string[] = [];
  switch (result.status) {
    case 'passed':
      lines.push(`Compile check: passed. ${result.summary}`);
      break;
    case 'skipped':
      lines.push(`Compile check: skipped. ${result.summary}`);
      break;
    case 'failed':
      lines.push(`Compile check: FAILED. ${result.summary}`);
      for (const err of result.errors) lines.push(formatScriptError(err));
      if (result.errors.length === 0) {
        for (const other of result.otherErrors.slice(0, 5)) lines.push(`  ${other}`);
      }
      if (result.logPath) lines.push(`  Full Godot output: ${result.logPath}`);
      break;
  }
  if (result.godot) lines.push(`  (${result.godot.path}, found via ${result.godot.source})`);
  return lines.join('\n');
}

export interface WorkingGodot extends GodotCandidate {
  /** `4.6.1` */
  version: string;
  /** What --version printed, e.g. `4.6.1.stable.official.14d19694e` */
  fullVersion: string;
}

/** The first candidate that answers --version as a Godot 4. */
export async function findWorkingGodot(candidates: GodotCandidate[]): Promise<WorkingGodot | undefined> {
  for (const candidate of candidates) {
    const answer = await queryVersion(candidate.path);
    if (answer && answer.version.startsWith('4.')) return { ...candidate, ...answer };
  }
  return undefined;
}

async function pickWorkingGodot(
  candidates: GodotCandidate[],
): Promise<{ path: string; source: string; version: string } | undefined> {
  const found = await findWorkingGodot(candidates);
  return found ? { path: found.path, source: found.source, version: found.version } : undefined;
}

async function queryVersion(path: string): Promise<{ version: string; fullVersion: string } | undefined> {
  try {
    const { stdout } = await execFileAsync(path, ['--version'], { timeout: 15_000, windowsHide: true });
    const line = stdout.trim().split(/\r?\n/).filter(Boolean).pop() ?? '';
    const match = line.match(/(\d+\.\d+(?:\.\d+)?)/);
    return match ? { version: match[1], fullVersion: line.trim() } : undefined;
  } catch {
    return undefined;
  }
}

function runGodot(
  path: string,
  args: string[],
  timeoutMs: number,
): Promise<{ text: string; exitCode: number | null; timedOut: boolean }> {
  return new Promise((resolvePromise) => {
    const chunks: string[] = [];
    const child = execFile(path, args, { timeout: timeoutMs, maxBuffer: 32 * 1024 * 1024, windowsHide: true }, (error) => {
      const timedOut = Boolean(error && (error as { killed?: boolean }).killed);
      resolvePromise({ text: chunks.join(''), exitCode: child.exitCode, timedOut });
    });
    child.stdout?.on('data', (d: Buffer | string) => chunks.push(String(d)));
    child.stderr?.on('data', (d: Buffer | string) => chunks.push(String(d)));
  });
}

function getFreePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as AddressInfo).port;
      server.close(() => resolvePort(port));
    });
  });
}

function parseGodotVersionMin(pluginCfgPath: string): string | undefined {
  try {
    return readFileSync(pluginCfgPath, 'utf-8').match(/^godot_version_min="([^"]+)"/m)?.[1];
  } catch {
    return undefined;
  }
}

// The plugin binds its WebSocket port in `_enter_tree`. Pointing it at a free
// port keeps the check off 6550, where the user's real editor may be listening.
export function throwawayProjectFile(port: number): string {
  return [
    'config_version=5',
    '',
    '[application]',
    '',
    'config/name="godot-mcp compile check"',
    '',
    '[editor_plugins]',
    '',
    'enabled=PackedStringArray("res://addons/godot_mcp/plugin.cfg")',
    '',
    '[godot_mcp]',
    '',
    'port_override_enabled=true',
    `port_override=${port}`,
    '',
  ].join('\n');
}

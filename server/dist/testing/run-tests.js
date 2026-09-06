import { execFile } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { findWorkingGodot } from '../installer/compile-check.js';
import { findGodotCandidates } from '../installer/godot-locator.js';
import { parseGodotLog } from '../installer/godot-log.js';
export const DEFAULT_TEST_TIMEOUT_MS = 180_000;
export const MAX_TEST_TIMEOUT_MS = 600_000;
export const LOG_FILE_NAME = 'godot-mcp-run-tests.log';
const CHECK_RE = /^\s*(?:\[[\w.-]+\]\s+)?(PASS|FAIL)\s+(.*)$/;
const SUMMARY_RE = /(\d+)\s+checks?,\s+(\d+)\s+failures?/i;
export function parseTestLog(text) {
    const parsed = parseGodotLog(text);
    const checks = [];
    let summary;
    for (const raw of text.split(/\r?\n/)) {
        const line = raw.replace(/\s+$/, '');
        const match = line.match(CHECK_RE);
        if (match) {
            const ok = match[1] === 'PASS';
            // label and detail are separated by two or more spaces; a lone label has no detail.
            const [label, ...rest] = match[2].split(/\s{2,}/);
            const detail = rest.join('  ').trim();
            checks.push(detail ? { label: label.trim(), ok, detail } : { label: label.trim(), ok });
            continue;
        }
        if (SUMMARY_RE.test(line))
            summary = line.trim();
    }
    return { checks, summary, errors: parsed.errors };
}
export function buildTestRunResult(input) {
    const { checks, summary, errors } = parseTestLog(input.text);
    const passed = checks.filter((c) => c.ok).length;
    const failed = checks.length - passed;
    const ok = !input.timedOut && input.exitCode === 0 && failed === 0;
    const tail = input.text
        .split(/\r?\n/)
        .map((l) => l.replace(/\s+$/, ''))
        .filter((l) => l && !CHECK_RE.test(l))
        .slice(-30);
    let headline;
    if (input.timedOut) {
        headline = `Timed out after ${Math.round(input.timeoutMs / 1000)}s with ${passed} passed, ${failed} failed so far`;
    }
    else if (checks.length === 0 && errors.length > 0) {
        headline = `Crashed before any check ran (exit ${input.exitCode ?? 'unknown'}): ${errors[0].message}`;
    }
    else if (checks.length === 0) {
        headline = `No PASS/FAIL lines in the output (exit ${input.exitCode ?? 'unknown'}); is ${input.command.includes('--script') ? 'the script' : 'the scene'} a test harness?`;
    }
    else if (ok) {
        headline = `${passed} passed, 0 failed (exit 0)`;
    }
    else {
        const why = failed > 0 ? `${failed} failed` : `exit code ${input.exitCode ?? 'unknown'} with no FAIL line`;
        headline = `${passed} passed, ${why}${errors.length > 0 ? `, ${errors.length} script error${errors.length === 1 ? '' : 's'}` : ''}`;
    }
    return {
        ok,
        passed,
        failed,
        checks,
        exit_code: input.exitCode,
        timed_out: input.timedOut,
        duration_ms: input.durationMs,
        summary,
        errors,
        command: input.command,
        log_tail: tail,
        log_path: input.logPath,
        headline,
    };
}
export function formatTestRunResult(result) {
    const lines = [`${result.ok ? 'PASSED' : 'FAILED'}: ${result.headline}${result.duration_ms ? ` in ${(result.duration_ms / 1000).toFixed(1)}s` : ''}`];
    for (const c of result.checks.filter((c) => !c.ok))
        lines.push(`  FAIL  ${c.label}${c.detail ? `  ${c.detail}` : ''}`);
    for (const e of result.errors.slice(0, 10))
        lines.push(`  ERROR ${e.message}${e.file ? ` (${e.file}${e.line !== undefined ? `:${e.line}` : ''})` : ''}`);
    if (result.summary)
        lines.push(`  ${result.summary}`);
    if (!result.ok && result.log_tail.length > 0) {
        lines.push('  Output tail:');
        for (const l of result.log_tail.slice(-12))
            lines.push(`    ${l}`);
    }
    if (result.log_path)
        lines.push(`  Full output: ${result.log_path}`);
    return lines.join('\n');
}
export function buildGodotTestArgs(projectPath, target, userArgs) {
    const base = ['--headless', '--path', projectPath];
    if (/\.gd$/i.test(target))
        base.push('--script', target);
    else
        base.push(target);
    if (userArgs.length > 0)
        base.push('--', ...userArgs);
    return base;
}
export async function runTests(opts) {
    const projectPath = resolve(opts.projectPath);
    const timeoutMs = Math.min(Math.max(opts.timeoutMs ?? DEFAULT_TEST_TIMEOUT_MS, 1_000), MAX_TEST_TIMEOUT_MS);
    if (!existsSync(join(projectPath, 'project.godot'))) {
        throw new Error(`Not a Godot project: ${projectPath} (no project.godot)`);
    }
    if (!/^res:\/\//.test(opts.target)) {
        throw new Error(`target must be a res:// path to a .tscn scene or .gd script, got ${opts.target}`);
    }
    const relTarget = opts.target.replace(/^res:\/\//, '');
    if (!existsSync(join(projectPath, ...relTarget.split('/')))) {
        throw new Error(`${opts.target} does not exist in ${projectPath}`);
    }
    const candidates = opts.candidates ?? (opts.godot ? findGodotCandidates(opts.godot).filter((c) => c.source === '--godot') : findGodotCandidates());
    const godot = await findWorkingGodot(candidates);
    if (!godot) {
        throw new Error(opts.godot
            ? `${opts.godot} is not a working Godot 4 executable`
            : 'No Godot 4 executable found. Pass godot (path) or set GODOT_BIN.');
    }
    const args = buildGodotTestArgs(projectPath, opts.target, opts.args ?? []);
    const command = [godot.path, ...args].map((a) => (/\s/.test(a) ? `"${a}"` : a)).join(' ');
    const started = Date.now();
    const run = await new Promise((resolveRun) => {
        const chunks = [];
        const child = execFile(godot.path, args, { timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024, windowsHide: true, cwd: projectPath }, (error) => {
            const timedOut = Boolean(error && error.killed);
            resolveRun({ text: chunks.join(''), exitCode: child.exitCode, timedOut });
        });
        child.stdout?.on('data', (d) => chunks.push(String(d)));
        child.stderr?.on('data', (d) => chunks.push(String(d)));
    });
    const durationMs = Date.now() - started;
    const provisional = buildTestRunResult({ ...run, durationMs, command, timeoutMs });
    if (provisional.ok)
        return provisional;
    const logPath = join(opts.tmpRoot ?? tmpdir(), LOG_FILE_NAME);
    try {
        writeFileSync(logPath, run.text);
    }
    catch {
        return provisional;
    }
    return { ...provisional, log_path: logPath };
}
//# sourceMappingURL=run-tests.js.map
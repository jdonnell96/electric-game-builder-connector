import { describe, it, expect } from 'vitest';
import { buildGodotTestArgs, buildTestRunResult, formatTestRunResult, parseTestLog } from '../../testing/run-tests.js';

// Verbatim shape of McDaniels' tests/smoke_test.tscn output, the first real
// consumer of run_tests.
const MCDANIELS_LOG = `Godot Engine v4.6.1.stable.official.14d19694e - https://godotengine.org

smoke_test: started
PASS  10 locations on the map
PASS  first location unlocked
FAIL  toast for perfect burger  expected 1 toast, got 0
PASS  store switcher lists all 10
smoke_test: 4 checks, 1 failures
SMOKE_RESULT: FAIL
`;

const CRASH_LOG = `Godot Engine v4.6.1.stable.official.14d19694e - https://godotengine.org

SCRIPT ERROR: Parse Error: Identifier "GameState" not declared in the current scope.
   at: GDScript::reload (res://tests/smoke_test.gd:22)
ERROR: Failed to load script "res://tests/smoke_test.gd" with error "Parse error".
   at: load (modules/gdscript/gdscript.cpp:2907)
`;

describe('parseTestLog', () => {
  it('reads PASS and FAIL lines, splitting label from detail on two spaces', () => {
    const parsed = parseTestLog(MCDANIELS_LOG);
    expect(parsed.checks).toEqual([
      { label: '10 locations on the map', ok: true },
      { label: 'first location unlocked', ok: true },
      { label: 'toast for perfect burger', ok: false, detail: 'expected 1 toast, got 0' },
      { label: 'store switcher lists all 10', ok: true },
    ]);
    expect(parsed.summary).toBe('smoke_test: 4 checks, 1 failures');
    expect(parsed.errors).toEqual([]);
  });

  it('tolerates a [tag] prefix, CRLF, and trailing spaces', () => {
    const parsed = parseTestLog('[kit] PASS  boots  \r\n[kit] FAIL  saves  slot 2 empty\r\n');
    expect(parsed.checks).toEqual([
      { label: 'boots', ok: true },
      { label: 'saves', ok: false, detail: 'slot 2 empty' },
    ]);
  });

  it('does not mistake prose containing PASS for a check', () => {
    const parsed = parseTestLog('the PASS word is not a check\nPASSWORD\nPASS  real\n');
    expect(parsed.checks).toEqual([{ label: 'real', ok: true }]);
  });

  it('collects Godot script errors', () => {
    const parsed = parseTestLog(CRASH_LOG);
    expect(parsed.checks).toEqual([]);
    expect(parsed.errors[0]).toMatchObject({ file: 'res://tests/smoke_test.gd', line: 22 });
  });
});

describe('buildTestRunResult', () => {
  const base = { command: 'godot --headless --path p res://tests/smoke_test.tscn -- --test-save', timeoutMs: 180_000, durationMs: 24_698 };

  it('fails on a FAIL line even though counts are otherwise fine', () => {
    const result = buildTestRunResult({ ...base, text: MCDANIELS_LOG, exitCode: 1, timedOut: false });
    expect(result.ok).toBe(false);
    expect(result.passed).toBe(3);
    expect(result.failed).toBe(1);
    expect(result.headline).toBe('3 passed, 1 failed');
    expect(result.log_tail).toEqual([
      'Godot Engine v4.6.1.stable.official.14d19694e - https://godotengine.org',
      'smoke_test: started',
      'smoke_test: 4 checks, 1 failures',
      'SMOKE_RESULT: FAIL',
    ]);
  });

  it('passes only with exit 0 and no failures', () => {
    const clean = MCDANIELS_LOG.replace('FAIL  toast for perfect burger  expected 1 toast, got 0\n', '').replace('1 failures', '0 failures');
    const result = buildTestRunResult({ ...base, text: clean, exitCode: 0, timedOut: false });
    expect(result.ok).toBe(true);
    expect(result.headline).toBe('3 passed, 0 failed (exit 0)');
  });

  it('honours a non-zero exit code with no FAIL line', () => {
    const clean = MCDANIELS_LOG.replace('FAIL  toast for perfect burger  expected 1 toast, got 0\n', '');
    const result = buildTestRunResult({ ...base, text: clean, exitCode: 2, timedOut: false });
    expect(result.ok).toBe(false);
    expect(result.headline).toBe('3 passed, exit code 2 with no FAIL line');
  });

  it('reports a crash before any check ran', () => {
    const result = buildTestRunResult({ ...base, text: CRASH_LOG, exitCode: 1, timedOut: false });
    expect(result.ok).toBe(false);
    expect(result.headline).toContain('Crashed before any check ran (exit 1)');
    expect(result.headline).toContain('GameState');
  });

  it('reports a timeout with the partial tally', () => {
    const result = buildTestRunResult({ ...base, text: 'PASS  a\nPASS  b\n', exitCode: null, timedOut: true });
    expect(result.ok).toBe(false);
    expect(result.timed_out).toBe(true);
    expect(result.headline).toBe('Timed out after 180s with 2 passed, 0 failed so far');
  });

  it('questions output with no checks at all', () => {
    const result = buildTestRunResult({ ...base, text: 'hello\n', exitCode: 0, timedOut: false });
    expect(result.ok).toBe(true);
    expect(result.headline).toContain('No PASS/FAIL lines');
  });
});

describe('formatTestRunResult', () => {
  it('leads with the verdict and lists only the failures', () => {
    const result = buildTestRunResult({
      command: 'godot',
      timeoutMs: 1000,
      durationMs: 1500,
      text: MCDANIELS_LOG,
      exitCode: 1,
      timedOut: false,
      logPath: 'C:\\tmp\\godot-mcp-run-tests.log',
    });
    const text = formatTestRunResult(result);
    expect(text.split('\n')[0]).toBe('FAILED: 3 passed, 1 failed in 1.5s');
    expect(text).toContain('  FAIL  toast for perfect burger  expected 1 toast, got 0');
    expect(text).not.toContain('10 locations');
    expect(text).toContain('smoke_test: 4 checks, 1 failures');
    expect(text).toContain('Full output: C:\\tmp\\godot-mcp-run-tests.log');
  });
});

describe('buildGodotTestArgs', () => {
  it('runs a scene directly and a script through --script, with user args after --', () => {
    expect(buildGodotTestArgs('C:\\p', 'res://tests/smoke_test.tscn', ['--test-save'])).toEqual([
      '--headless', '--path', 'C:\\p', 'res://tests/smoke_test.tscn', '--', '--test-save',
    ]);
    expect(buildGodotTestArgs('/p', 'res://tests/unit.gd', [])).toEqual(['--headless', '--path', '/p', '--script', 'res://tests/unit.gd']);
  });
});

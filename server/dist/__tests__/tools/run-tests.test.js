import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockGodot, createToolContext } from '../helpers/mock-godot.js';
const runTests = vi.fn();
vi.mock('../../testing/run-tests.js', async (importOriginal) => {
    const actual = await importOriginal();
    return { ...actual, runTests: (...args) => runTests(...args) };
});
const { runTestsTool } = await import('../../tools/run-tests.js');
const RESULT = {
    ok: false,
    passed: 3,
    failed: 1,
    checks: [{ label: 'x', ok: false, detail: 'boom' }],
    exit_code: 1,
    timed_out: false,
    duration_ms: 1200,
    errors: [],
    command: 'godot',
    log_tail: [],
    headline: '3 passed, 1 failed',
};
describe('godot_run_tests tool', () => {
    beforeEach(() => {
        runTests.mockReset();
        runTests.mockResolvedValue(RESULT);
    });
    it('is not read-only: it executes project code', () => {
        expect(runTestsTool.annotations?.readOnlyHint).toBe(false);
    });
    it('uses the connected project and returns text plus structured content', async () => {
        const ctx = createToolContext(createMockGodot());
        Object.assign(ctx.godot, { isConnected: true, projectPath: 'C:/games/burgers' });
        const result = await runTestsTool.execute({ action: 'run', target: 'res://tests/smoke_test.tscn', args: ['--test-save'] }, ctx);
        expect(runTests).toHaveBeenCalledWith({
            projectPath: 'C:/games/burgers',
            target: 'res://tests/smoke_test.tscn',
            args: ['--test-save'],
            timeoutMs: undefined,
            godot: undefined,
        });
        const r = result;
        expect(r.text.split('\n')[0]).toBe('FAILED: 3 passed, 1 failed in 1.2s');
        expect(r.text).toContain('FAIL  x  boom');
        expect(r.structuredContent).toBe(RESULT);
    });
    it('refuses without a project', async () => {
        const ctx = createToolContext(createMockGodot());
        Object.assign(ctx.godot, { isConnected: false, projectPath: null });
        await expect(runTestsTool.execute({ action: 'run', target: 'res://t.tscn' }, ctx)).rejects.toThrow('No project to test');
    });
    it('rejects a timeout above the cap at the schema', () => {
        expect(runTestsTool.schema.safeParse({ action: 'run', target: 'res://t.tscn', timeout_ms: 10_000_000 }).success).toBe(false);
    });
});
//# sourceMappingURL=run-tests.test.js.map
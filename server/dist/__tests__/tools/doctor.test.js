import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockGodot, createToolContext } from '../helpers/mock-godot.js';
const runDoctor = vi.fn();
vi.mock('../../doctor/run.js', () => ({
    runDoctor: (...args) => runDoctor(...args),
    formatDoctorReport: (report) => `formatted ${report.serverVersion}`,
}));
const { doctor } = await import('../../tools/doctor.js');
const REPORT = {
    serverVersion: '4.1.11',
    node: 'v20.17.0',
    platform: 'win32',
    takenAt: 't',
    findings: [{ id: 'port_6007', status: 'fail', title: 'x' }],
    summary: { ok: 0, warn: 0, fail: 1, skip: 0 },
    exitCode: 1,
};
describe('godot_doctor tool', () => {
    beforeEach(() => {
        runDoctor.mockReset();
        runDoctor.mockResolvedValue(REPORT);
    });
    it('is read-only and needs no bridge', () => {
        expect(doctor.annotations?.readOnlyHint).toBe(true);
    });
    it('uses the connected project when no path is given', async () => {
        const mock = createMockGodot();
        const ctx = createToolContext(mock);
        Object.assign(ctx.godot, { isConnected: true, projectPath: 'C:/games/burgers' });
        const result = await doctor.execute({ action: 'run' }, ctx);
        expect(runDoctor).toHaveBeenCalledWith({ projectPath: 'C:/games/burgers', skipCompileCheck: undefined });
        expect(result).toEqual({ text: 'formatted 4.1.11', structuredContent: REPORT });
        expect(mock.calls).toEqual([]);
    });
    it('prefers an explicit project_path and passes the skip flag', async () => {
        const ctx = createToolContext(createMockGodot());
        Object.assign(ctx.godot, { isConnected: false, projectPath: null });
        await doctor.execute({ action: 'run', project_path: '/p', skip_compile_check: true }, ctx);
        expect(runDoctor).toHaveBeenCalledWith({ projectPath: '/p', skipCompileCheck: true });
    });
    it('passes no project when disconnected and none given', async () => {
        const ctx = createToolContext(createMockGodot());
        Object.assign(ctx.godot, { isConnected: false, projectPath: null });
        await doctor.execute({ action: 'run' }, ctx);
        expect(runDoctor).toHaveBeenCalledWith({ projectPath: undefined, skipCompileCheck: undefined });
    });
});
//# sourceMappingURL=doctor.test.js.map
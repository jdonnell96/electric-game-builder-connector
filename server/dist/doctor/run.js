import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { findWorkingGodot } from '../installer/compile-check.js';
import { findGodotCandidates } from '../installer/godot-locator.js';
import { getServerVersion } from '../version.js';
import { checkAddonCompile, checkBridgePort, checkDebugPort, checkEditors, checkExportTemplates, checkGodotBinary, checkNodeVersion, checkProject, checkServerBuild, checkServerProcesses, DEFAULT_BRIDGE_PORT, projectPathFromCommandLine, } from './checks.js';
import { takeSystemSnapshot } from './system.js';
export async function runDoctor(opts = {}) {
    const platform = opts.platform ?? process.platform;
    const env = opts.env ?? process.env;
    const home = opts.home ?? homedir();
    const serverVersion = opts.serverVersion ?? getServerVersion();
    const bridgePort = opts.bridgePort ?? (Number(env.GODOT_PORT) || DEFAULT_BRIDGE_PORT);
    const findings = [];
    const [snapshot, godot] = await Promise.all([
        opts.snapshot ?? takeSystemSnapshot(platform),
        resolveGodot(opts),
    ]);
    findings.push(checkNodeVersion());
    findings.push(checkServerBuild(serverVersion));
    findings.push(checkGodotBinary(godot, opts.godot));
    const editors = checkEditors(snapshot);
    findings.push(editors.finding);
    const debug = checkDebugPort(snapshot);
    findings.push(debug.finding);
    const bridge = checkBridgePort(snapshot, serverVersion, bridgePort);
    findings.push(bridge.finding, ...bridge.extra);
    findings.push(...checkServerProcesses(snapshot, bridge.holderPid, debug.foreignPids));
    const project = resolveProject(opts, editors.editors.map((e) => projectPathFromCommandLine(e.commandLine)));
    if (project) {
        const projectResult = checkProject(project.path, serverVersion);
        findings.push(...projectResult.findings);
        if (projectResult.addonDir && godot && !opts.skipCompileCheck) {
            findings.push(await checkAddonCompile(projectResult.addonDir, godot));
        }
        else if (projectResult.addonDir && !godot) {
            findings.push({ id: 'addon_compile', status: 'skip', title: 'Addon compile check skipped: no Godot executable found' });
        }
    }
    else {
        findings.push({
            id: 'project',
            status: 'skip',
            title: 'No project checked: none given, no editor running with --path, and the current directory has no project.godot',
            fix: ['Run again with the project folder: npx @satelliteoflove/godot-mcp --doctor <path-to-project>'],
        });
    }
    if (godot) {
        findings.push(checkExportTemplates(godot.fullVersion, platform, env, home));
    }
    const summary = { ok: 0, warn: 0, fail: 0, skip: 0 };
    for (const f of findings)
        summary[f.status]++;
    return {
        serverVersion,
        node: process.version,
        platform,
        takenAt: snapshot.takenAt,
        project,
        godot,
        findings,
        summary,
        exitCode: summary.fail > 0 ? 1 : 0,
    };
}
async function resolveGodot(opts) {
    if (opts.godotCandidates)
        return findWorkingGodot(opts.godotCandidates);
    const candidates = opts.godot
        ? findGodotCandidates(opts.godot).filter((c) => c.source === '--godot')
        : findGodotCandidates();
    return findWorkingGodot(candidates);
}
function resolveProject(opts, editorProjects) {
    if (opts.projectPath)
        return { path: resolve(opts.projectPath), source: 'argument' };
    const fromEditor = editorProjects.find((p) => typeof p === 'string' && p.length > 0);
    if (fromEditor)
        return { path: resolve(fromEditor), source: 'running editor' };
    const cwd = opts.cwd ?? process.cwd();
    if (existsSync(join(cwd, 'project.godot')))
        return { path: resolve(cwd), source: 'current directory' };
    return undefined;
}
const STATUS_LABEL = { ok: 'OK  ', warn: 'WARN', fail: 'FAIL', skip: 'SKIP' };
export function formatDoctorReport(report) {
    const lines = [];
    lines.push(`godot-mcp doctor  (server ${report.serverVersion}, node ${report.node}, ${report.platform})`);
    if (report.project)
        lines.push(`Project: ${report.project.path}  (from ${report.project.source})`);
    lines.push('');
    report.findings.forEach((f, i) => {
        const num = String(i + 1).padStart(2, ' ');
        lines.push(`${num}. ${STATUS_LABEL[f.status]}  ${f.title}`);
        for (const d of f.detail ?? [])
            lines.push(`          ${d}`);
        (f.fix ?? []).forEach((fix, j) => lines.push(`          ${j === 0 ? 'Fix: ' : '     '}${fix}`));
    });
    lines.push('');
    const { fail, warn, skip } = report.summary;
    if (fail === 0 && warn === 0) {
        lines.push(skip > 0 ? `No problems found (${skip} check${skip === 1 ? '' : 's'} skipped, see SKIP above).` : 'Everything looks fine.');
    }
    else {
        const parts = [];
        if (fail > 0)
            parts.push(`${fail} problem${fail === 1 ? '' : 's'}`);
        if (warn > 0)
            parts.push(`${warn} warning${warn === 1 ? '' : 's'}`);
        lines.push(`${parts.join(', ')}.${fail > 0 ? ' Fix the FAIL items first; each names the command to run.' : ''}`);
    }
    return lines.join('\n');
}
// ----------------------------------------------------------- timeout hint
let cachedHint = null;
const HINT_TTL_MS = 15_000;
/**
 * One paragraph to append to a bridge timeout. When a foreign process sits on
 * the debugger port it says so by PID, because that is the cause nine times
 * out of ten and nothing in the editor reports it. Cached briefly: a burst of
 * timeouts should not fork PowerShell for each one.
 */
export async function timeoutHint(snapshot) {
    if (!snapshot && cachedHint && Date.now() - cachedHint.at < HINT_TTL_MS)
        return cachedHint.text;
    let text;
    try {
        const snap = snapshot ?? (await takeSystemSnapshot());
        const debug = checkDebugPort(snap);
        if (debug.finding.status === 'fail') {
            text = [
                '',
                `Likely cause: ${debug.finding.title}.`,
                ...(debug.finding.detail ?? []).slice(0, debug.foreignPids.length).map((d) => `  ${d}`),
                ...(debug.finding.fix ?? []).slice(0, 2).map((f) => `  ${f}`),
            ].join('\n');
        }
        else {
            text = '\nRun `npx @satelliteoflove/godot-mcp --doctor` to check ports 6007/6550, the addon, and the editor.';
        }
    }
    catch {
        text = '\nRun `npx @satelliteoflove/godot-mcp --doctor` to check ports 6007/6550, the addon, and the editor.';
    }
    if (!snapshot)
        cachedHint = { at: Date.now(), text };
    return text;
}
//# sourceMappingURL=run.js.map
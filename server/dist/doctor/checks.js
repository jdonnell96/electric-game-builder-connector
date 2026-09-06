import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { runAddonCompileCheck } from '../installer/compile-check.js';
import { defaultBundledAddonDir } from '../installer/install.js';
import { isDeleteLeftover, readManifest, verifyAddonDir, walkFiles } from '../installer/manifest.js';
import { checkBuildFreshness } from '../utils/build-info.js';
import { ancestors, describeProcess, findProcess, peerOf } from './system.js';
/** Godot's remote debugger port: the editor listens, the running game is its one peer. */
export const DEBUG_PORT = 6007;
/** The addon's WebSocket port for MCP servers. */
export const DEFAULT_BRIDGE_PORT = 6550;
// ---------------------------------------------------------------- processes
export function isGodotProcess(p) {
    return /godot/i.test(p.name) || /^godot/i.test(executableOf(p.commandLine));
}
/** Basename of the first command-line token, quotes stripped. */
function executableOf(commandLine) {
    const token = commandLine.match(/^\s*(?:"([^"]+)"|'([^']+)'|(\S+))/);
    const path = token?.[1] ?? token?.[2] ?? token?.[3] ?? '';
    return path.split(/[\\/]/).pop() ?? '';
}
/** A game the editor launched: it carries the editor's debug endpoint on its command line. */
export function isGodotGame(p) {
    return isGodotProcess(p) && /--remote-debug\b|--editor-pid\b/.test(p.commandLine);
}
export function isGodotEditor(p) {
    return isGodotProcess(p) && !isGodotGame(p) && !/--headless\b/.test(p.commandLine);
}
export function projectPathFromCommandLine(commandLine) {
    const match = commandLine.match(/--path\s+(?:"([^"]+)"|'([^']+)'|(\S+))/);
    const raw = match?.[1] ?? match?.[2] ?? match?.[3];
    return raw ? raw.replace(/[\\/]+$/, '') : undefined;
}
// The npm package (@satelliteoflove/godot-mcp/dist/cli.js) or a source checkout
// (<anything>godot-mcp<anything>/server/dist/cli.js). Other tools named
// godot-mcp-something/dist/index.js are not ours.
const OUR_SERVER_DIR = String.raw `(?:@satelliteoflove[\\/]godot-mcp|godot-mcp[^\\/]*[\\/]server)`;
const OUR_SERVER_RE = new RegExp(`${OUR_SERVER_DIR}[\\\\/]dist[\\\\/](?:cli|index)\\.js`, 'i');
const OUR_SERVER_DIR_RE = new RegExp(`^(.*?${OUR_SERVER_DIR})[\\\\/]dist[\\\\/](?:cli|index)\\.js$`, 'i');
/** A godot-mcp server process: the npm package or a source checkout of it. Not the npx launcher. */
export function isOurServer(p) {
    return OUR_SERVER_RE.test(p.commandLine);
}
/** The package (or checkout) directory a running godot-mcp server was started from. */
export function serverPackageDir(p) {
    const tokens = p.commandLine.match(/"[^"]+"|'[^']+'|\S+/g) ?? [];
    for (const token of tokens) {
        const bare = token.replace(/^["']|["']$/g, '');
        const match = bare.match(OUR_SERVER_DIR_RE);
        if (match)
            return resolve(match[1]);
    }
    return undefined;
}
/** Other Godot tooling (LSP/DAP bridges, other MCP servers) that may sit on Godot's ports. */
export function isOtherGodotTool(p) {
    if (!/node|bun|deno|python|dotnet/i.test(p.name))
        return false;
    if (!/godot/i.test(p.commandLine))
        return false;
    if (isOurServer(p))
        return false;
    if (/npx-cli\.js|npm-cli\.js/i.test(p.commandLine))
        return false;
    return true;
}
function stopCommand(pid, platform) {
    return platform === 'win32' ? `Stop-Process -Id ${pid}` : `kill ${pid}`;
}
function parentNote(snapshot, pid) {
    const chain = ancestors(snapshot, pid, 3).filter((a) => a.pid > 4);
    if (chain.length === 0)
        return '';
    return `  (started by ${chain.map((a) => `${a.name} PID ${a.pid}`).join(' < ')})`;
}
// ------------------------------------------------------------------- checks
export function checkNodeVersion(version = process.version) {
    const major = Number(version.replace(/^v/, '').split('.')[0]);
    if (major >= 20)
        return { id: 'node', status: 'ok', title: `Node ${version}` };
    return {
        id: 'node',
        status: 'fail',
        title: `Node ${version} is too old; godot-mcp needs Node 20 or newer`,
        fix: ['Install Node 20+ from https://nodejs.org and restart your MCP client.'],
    };
}
export function checkServerBuild(serverVersion) {
    const build = checkBuildFreshness();
    if (build.stale) {
        return {
            id: 'server_build',
            status: 'warn',
            title: `Server ${serverVersion} is running from a stale build`,
            detail: build.reason ? [build.reason] : undefined,
            fix: ['Run `npm run build` in server/ and restart your MCP client.'],
        };
    }
    return { id: 'server_build', status: 'ok', title: `Server ${serverVersion} (${build.mode === 'packaged' ? 'installed package' : build.mode})` };
}
export function checkGodotBinary(godot, explicit) {
    if (godot) {
        return { id: 'godot', status: 'ok', title: `Godot ${godot.fullVersion} at ${godot.path} (via ${godot.source})` };
    }
    if (explicit) {
        return {
            id: 'godot',
            status: 'fail',
            title: `--godot ${explicit} is not a working Godot 4 executable`,
            fix: ['Point --godot at the Godot 4 executable itself (on macOS, the Godot.app bundle also works).'],
        };
    }
    return {
        id: 'godot',
        status: 'warn',
        title: 'No Godot 4 executable found; the addon compile check and export-template check were skipped',
        detail: ['Looked at GODOT_BIN, GODOT_PATH, PATH, the Steam/Scoop/Chocolatey/Homebrew/Flatpak locations, and the Downloads folder.'],
        fix: ['Pass --godot <path-to-godot>, or set GODOT_BIN, or put godot on your PATH.'],
    };
}
export function checkEditors(snapshot) {
    if (snapshot.errors.length > 0) {
        return {
            finding: { id: 'editor', status: 'skip', title: 'Could not enumerate processes', detail: snapshot.errors },
            editors: [],
        };
    }
    const editors = snapshot.processes.filter(isGodotEditor);
    if (editors.length === 0) {
        return {
            finding: {
                id: 'editor',
                status: 'warn',
                title: 'No Godot editor is running',
                detail: ['The MCP server talks to the addon inside the editor, so nothing can connect until the project is open.'],
                fix: ['Open your project in Godot 4.5+ and enable the plugin under Project > Project Settings > Plugins > Godot MCP.'],
            },
            editors,
        };
    }
    const lines = editors.map((e) => {
        const project = projectPathFromCommandLine(e.commandLine);
        return `${describeProcess(e, 0).replace(/\s+$/, '')}${project ? `  project ${project}` : ''}`;
    });
    if (editors.length === 1) {
        return { finding: { id: 'editor', status: 'ok', title: `Godot editor running: ${lines[0]}` }, editors };
    }
    return {
        finding: {
            id: 'editor',
            status: 'warn',
            title: `${editors.length} Godot editors are running; only one addon can hold port ${DEFAULT_BRIDGE_PORT}`,
            detail: lines,
            fix: ['Close the editors you are not using, or give each project its own port override in the MCP panel and matching GODOT_PORT.'],
        },
        editors,
    };
}
export function checkDebugPort(snapshot, port = DEBUG_PORT) {
    if (snapshot.errors.length > 0) {
        return { finding: { id: 'port_6007', status: 'skip', title: `Could not inspect port ${port}`, detail: snapshot.errors }, foreignPids: [] };
    }
    const listener = snapshot.connections.find((c) => c.localPort === port && c.state === 'listen');
    const listenerProcess = findProcess(snapshot, listener?.pid);
    const editors = snapshot.processes.filter(isGodotEditor);
    // Every process attached to the port, seen from either end of the socket.
    const attached = new Map();
    for (const c of snapshot.connections) {
        if (c.state !== 'established')
            continue;
        if (c.localPort === port) {
            const peer = peerOf(snapshot, c);
            if (peer)
                attached.set(peer.pid, peer);
        }
        else if (c.remotePort === port && c.pid !== null) {
            const p = findProcess(snapshot, c.pid);
            if (p)
                attached.set(p.pid, p);
        }
    }
    if (listenerProcess)
        attached.delete(listenerProcess.pid);
    const games = [...attached.values()].filter(isGodotGame);
    const foreign = [...attached.values()].filter((p) => !isGodotGame(p));
    if (foreign.length > 0) {
        const detail = foreign.map((p) => `${describeProcess(p)}${parentNote(snapshot, p.pid)}`);
        detail.push(`Port ${port} is Godot's remote debugger. The editor listens and the running game is meant to be its only peer; any other connection corrupts the channel, and every exec, screenshot, game_time and runtime_state call then times out with no error in the editor.`);
        return {
            finding: {
                id: 'port_6007',
                status: 'fail',
                title: `Port ${port} (game debugger) has ${foreign.length === 1 ? 'a foreign peer' : `${foreign.length} foreign peers`}`,
                detail,
                fix: [
                    ...foreign.map((p) => `Stop it now: ${stopCommand(p.pid, snapshot.platform)}`),
                    `Then keep it off ${port}: remove it from your MCP client config, or move it to the port it belongs on (Godot's language server is 6005, its debug adapter is 6006; a GODOT_LSP_PORT=${port} setting is the usual culprit).`,
                    'Stop and re-run the game afterwards so the editor reopens a clean debugger session.',
                ],
            },
            foreignPids: foreign.map((p) => p.pid),
        };
    }
    if (!listener) {
        if (editors.length === 0) {
            return { finding: { id: 'port_6007', status: 'skip', title: `Port ${port} (game debugger): no editor running, nothing to check` }, foreignPids: [] };
        }
        return {
            finding: {
                id: 'port_6007',
                status: 'warn',
                title: `An editor is running but nothing listens on port ${port}`,
                detail: ['The editor normally listens on its remote-debug port from startup. The project may set network/debug/remote_port to a different port.'],
                fix: ['Check Project > Project Settings > Network > Debug > Remote Port. godot-mcp expects the default 6007.'],
            },
            foreignPids: [],
        };
    }
    const who = listenerProcess ? describeProcess(listenerProcess, 0) : `PID ${listener.pid ?? '?'}`;
    const gameNote = games.length > 0 ? `; game attached: ${games.map((g) => `PID ${g.pid}`).join(', ')}` : '; no game attached';
    return {
        finding: { id: 'port_6007', status: 'ok', title: `Port ${port} (game debugger): ${who} listening, no foreign peers${gameNote}` },
        foreignPids: [],
    };
}
export function checkBridgePort(snapshot, serverVersion, port = DEFAULT_BRIDGE_PORT) {
    if (snapshot.errors.length > 0) {
        return { finding: { id: 'port_6550', status: 'skip', title: `Could not inspect port ${port}`, detail: snapshot.errors }, extra: [], holderPid: null };
    }
    const editors = snapshot.processes.filter(isGodotEditor);
    const listener = snapshot.connections.find((c) => c.localPort === port && c.state === 'listen');
    const listenerProcess = findProcess(snapshot, listener?.pid);
    if (!listener) {
        if (editors.length === 0) {
            return { finding: { id: 'port_6550', status: 'skip', title: `Port ${port} (MCP bridge): no editor running, nothing to check` }, extra: [], holderPid: null };
        }
        return {
            finding: {
                id: 'port_6550',
                status: 'fail',
                title: `The editor is running but the addon is not listening on port ${port}`,
                detail: ['Either the plugin is not enabled, it failed to load, or a port override is set in the MCP panel.'],
                fix: [
                    'Enable it: Project > Project Settings > Plugins > Godot MCP. The MCP panel at the bottom of the editor should say "Waiting for connection".',
                    'If it is enabled, run `npx @satelliteoflove/godot-mcp --install-addon <project>` to repair and compile-check the addon, then restart the editor.',
                    `If you set a port override, start the server with the same GODOT_PORT (currently expecting ${port}).`,
                ],
            },
            extra: [],
            holderPid: null,
        };
    }
    if (listenerProcess && !isGodotProcess(listenerProcess)) {
        return {
            finding: {
                id: 'port_6550',
                status: 'fail',
                title: `Port ${port} is held by ${describeProcess(listenerProcess)}, not the Godot editor`,
                fix: [
                    `Stop it (${stopCommand(listenerProcess.pid, snapshot.platform)}) and restart the editor, or set a port override in the MCP panel and a matching GODOT_PORT for the server.`,
                ],
            },
            extra: [],
            holderPid: null,
        };
    }
    const clients = [];
    const clientPids = new Set();
    for (const c of snapshot.connections) {
        if (c.state !== 'established' || c.localPort !== port)
            continue;
        const peer = peerOf(snapshot, c);
        if (peer && !clientPids.has(peer.pid)) {
            clientPids.add(peer.pid);
            clients.push(peer);
        }
        else if (!peer) {
            clientPids.add(-c.remotePort);
        }
    }
    const who = listenerProcess ? `editor PID ${listenerProcess.pid}` : `PID ${listener.pid ?? '?'}`;
    const extra = [];
    for (const client of clients)
        extra.push(...inspectConnectedServer(client, serverVersion, snapshot));
    if (clients.length === 0 && clientPids.size === 0) {
        return {
            finding: { id: 'port_6550', status: 'ok', title: `Port ${port} (MCP bridge): ${who} listening, no client connected yet` },
            extra,
            holderPid: null,
        };
    }
    const detail = clients.map((c) => `${describeProcess(c)}${c.pid === process.pid ? '  (this process)' : ''}${parentNote(snapshot, c.pid)}`);
    if (clients.length <= 1) {
        return {
            finding: { id: 'port_6550', status: 'ok', title: `Port ${port} (MCP bridge): ${who} listening, one client connected`, detail },
            extra,
            holderPid: clients[0]?.pid ?? null,
        };
    }
    return {
        finding: {
            id: 'port_6550',
            status: 'warn',
            title: `Port ${port} (MCP bridge): ${clients.length} clients are connected; the addon serves only the first`,
            detail,
            fix: ['Stop the MCP client sessions you are not using. The addon rejects a second client with "Another client is already connected".'],
        },
        extra,
        holderPid: clients[0]?.pid ?? null,
    };
}
function inspectConnectedServer(client, serverVersion, snapshot) {
    if (!isOurServer(client))
        return [];
    const dir = serverPackageDir(client);
    if (!dir)
        return [];
    const findings = [];
    const pkgPath = join(dir, 'package.json');
    let version;
    try {
        version = JSON.parse(readFileSync(pkgPath, 'utf-8')).version;
    }
    catch {
        version = undefined;
    }
    if (version && version !== serverVersion && client.pid !== process.pid) {
        findings.push({
            id: 'connected_server_version',
            status: 'warn',
            title: `The connected server (PID ${client.pid}) is godot-mcp ${version}; this command is ${serverVersion}`,
            detail: [`It runs from ${dir}`],
            fix: ['Not a problem by itself, but keep the addon in the project at the version of the server that connects to it.'],
        });
    }
    const addonDir = join(dir, 'addon');
    if (existsSync(addonDir)) {
        const leftovers = walkFiles(addonDir).filter((rel) => isDeleteLeftover(rel.split('/').pop() ?? ''));
        const manifest = readManifest(addonDir);
        const verify = manifest ? verifyAddonDir(addonDir, manifest) : undefined;
        const missing = verify?.missing ?? [];
        if (leftovers.length > 0 || missing.length > 0) {
            findings.push({
                id: 'connected_server_package',
                status: 'fail',
                title: `The connected server (PID ${client.pid}) runs from a damaged package copy`,
                detail: [
                    `${dir}`,
                    ...leftovers.map((f) => `leftover: addon/${f}`),
                    ...missing.map((f) => `missing: addon/${f}`),
                    'Its --install-addon would install an addon that cannot compile.',
                ],
                fix: [
                    `Delete ${npxEntryOf(dir) ?? dir} and restart your MCP client so npx downloads a clean copy.`,
                ],
            });
        }
    }
    void snapshot;
    return findings;
}
function npxEntryOf(dir) {
    const parts = dir.split(/[\\/]/);
    const i = parts.lastIndexOf('_npx');
    return i >= 0 && i + 1 < parts.length ? parts.slice(0, i + 2).join(dir.includes('\\') ? '\\' : '/') : undefined;
}
export function checkServerProcesses(snapshot, holderPid, excludePids = []) {
    if (snapshot.errors.length > 0)
        return [];
    const ours = snapshot.processes.filter(isOurServer);
    const findings = [];
    if (ours.length >= 2) {
        const detail = ours.map((p) => {
            const tag = p.pid === holderPid ? '  (holds the bridge)' : p.pid === process.pid ? '  (this process)' : '  (waiting; rejected by the addon)';
            return `${describeProcess(p)}${tag}${parentNote(snapshot, p.pid)}`;
        });
        findings.push({
            id: 'servers',
            status: 'warn',
            title: `${ours.length} godot-mcp servers are running; the addon serves one at a time`,
            detail,
            fix: [
                'Each MCP client session (Claude Desktop, Claude Code, an IDE) starts its own server. Close the sessions you are not using, or stop the extras:',
                ...ours.filter((p) => p.pid !== holderPid && p.pid !== process.pid).map((p) => `  ${stopCommand(p.pid, snapshot.platform)}`),
            ],
        });
    }
    else if (ours.length === 1) {
        findings.push({ id: 'servers', status: 'ok', title: `One godot-mcp server running: ${describeProcess(ours[0])}${ours[0].pid === process.pid ? '  (this process)' : ''}` });
    }
    else {
        findings.push({ id: 'servers', status: 'ok', title: 'No godot-mcp server running (normal when nothing has connected your MCP client yet)' });
    }
    const others = snapshot.processes.filter((p) => isOtherGodotTool(p) && !excludePids.includes(p.pid));
    if (others.length > 0) {
        findings.push({
            id: 'other_tools',
            status: 'warn',
            title: `${others.length} other Godot tooling process${others.length === 1 ? ' is' : 'es are'} running`,
            detail: others.map((p) => `${describeProcess(p)}${parentNote(snapshot, p.pid)}`),
            fix: [
                `Fine as long as none of them attaches to port ${DEBUG_PORT}. If runtime calls start timing out, run doctor again while the game is running; the port ${DEBUG_PORT} finding will name the offender.`,
            ],
        });
    }
    return findings;
}
export function checkProject(projectPath, serverVersion, bundledAddonDir = defaultBundledAddonDir()) {
    const findings = [];
    const projectFile = join(projectPath, 'project.godot');
    if (!existsSync(projectFile)) {
        findings.push({
            id: 'project',
            status: 'fail',
            title: `Not a Godot project: ${projectPath} has no project.godot`,
            fix: ['Pass the folder that contains project.godot.'],
        });
        return { findings };
    }
    const projectText = readFileSync(projectFile, 'utf-8');
    const addonDir = join(projectPath, 'addons', 'godot_mcp');
    const pluginCfg = join(addonDir, 'plugin.cfg');
    if (!existsSync(pluginCfg)) {
        findings.push({
            id: 'addon',
            status: 'fail',
            title: `The godot-mcp addon is not installed in ${projectPath}`,
            fix: [`npx @satelliteoflove/godot-mcp --install-addon "${projectPath}"`],
        });
        return { findings };
    }
    const addonVersion = readFileSync(pluginCfg, 'utf-8').match(/^version="([^"]+)"/m)?.[1];
    if (addonVersion === serverVersion) {
        findings.push({ id: 'addon', status: 'ok', title: `Addon ${addonVersion} installed, matching server ${serverVersion}` });
    }
    else {
        findings.push({
            id: 'addon',
            status: 'warn',
            title: `Addon ${addonVersion ?? 'of unknown version'} is installed but the server is ${serverVersion}`,
            detail: ['The two are released together; mismatched versions can disagree about commands.'],
            fix: [`Close the editor, then: npx @satelliteoflove/godot-mcp --install-addon "${projectPath}"`],
        });
    }
    // Integrity: the addon's own manifest first; the bundled one when the
    // versions match and the install predates manifests.
    const manifest = readManifest(addonDir) ?? (addonVersion === serverVersion ? readManifest(bundledAddonDir) : undefined);
    if (manifest) {
        const verify = verifyAddonDir(addonDir, manifest);
        if (verify.missing.length > 0 || verify.leftovers.length > 0) {
            findings.push({
                id: 'addon_files',
                status: 'fail',
                title: `The installed addon is incomplete: ${verify.missing.length} file(s) missing, ${verify.leftovers.length} delete leftover(s)`,
                detail: [...verify.missing.map((f) => `missing: ${f}`), ...verify.leftovers.map((f) => `leftover: ${f}`)],
                fix: [`Repair it: npx @satelliteoflove/godot-mcp --install-addon "${projectPath}"`, 'Then restart the editor.'],
            });
        }
        else if (verify.mismatched.length > 0) {
            findings.push({
                id: 'addon_files',
                status: 'warn',
                title: `${verify.mismatched.length} addon file(s) differ from the package (edited locally?)`,
                detail: verify.mismatched,
                fix: [`To restore the packaged files: npx @satelliteoflove/godot-mcp --install-addon "${projectPath}" --force`],
            });
        }
        else {
            findings.push({ id: 'addon_files', status: 'ok', title: `All ${verify.verified} addon files verified against the manifest` });
        }
    }
    else {
        findings.push({
            id: 'addon_files',
            status: 'skip',
            title: 'Addon integrity not checked: no manifest for this addon version',
            fix: [`Reinstall with a manifest-aware server: npx @satelliteoflove/godot-mcp --install-addon "${projectPath}"`],
        });
    }
    const enabled = /^\s*enabled\s*=\s*PackedStringArray\([^)]*"res:\/\/addons\/godot_mcp\/plugin\.cfg"/m.test(projectText);
    if (enabled) {
        findings.push({ id: 'plugin_enabled', status: 'ok', title: 'Plugin enabled in project.godot' });
    }
    else {
        findings.push({
            id: 'plugin_enabled',
            status: 'fail',
            title: 'The plugin is installed but not enabled in project.godot',
            fix: ['In the editor: Project > Project Settings > Plugins > tick Godot MCP. Nothing listens on the bridge port until then.'],
        });
    }
    const autoload = /^\s*MCPGameBridge\s*=\s*"[^"]*addons\/godot_mcp\/game_bridge\/mcp_game_bridge\.gd"/m.test(projectText);
    if (autoload) {
        findings.push({ id: 'autoload', status: 'ok', title: 'MCPGameBridge autoload registered (runtime tools reach the game)' });
    }
    else if (enabled) {
        findings.push({
            id: 'autoload',
            status: 'warn',
            title: 'MCPGameBridge autoload is not in project.godot yet',
            detail: ['The plugin adds it the first time it loads; until then runtime tools (exec, screenshot, game_time, runtime_state) cannot reach the game.'],
            fix: ['Open the project in the editor once with the plugin enabled, then check again.'],
        });
    }
    return { findings, addonDir, addonVersion };
}
export async function checkAddonCompile(addonDir, godot) {
    const result = await runAddonCompileCheck(addonDir, { candidates: [{ path: godot.path, source: godot.source }] });
    if (result.status === 'passed') {
        return { id: 'addon_compile', status: 'ok', title: `Addon compiles: ${result.summary}` };
    }
    if (result.status === 'skipped') {
        return { id: 'addon_compile', status: 'skip', title: `Addon compile check skipped: ${result.summary}` };
    }
    return {
        id: 'addon_compile',
        status: 'fail',
        title: `Addon does not compile: ${result.summary}`,
        detail: [
            ...result.errors.map((e) => `${e.message}${e.file ? ` (${e.file}${e.line !== undefined ? `:${e.line}` : ''})` : ''}`),
            ...(result.logPath ? [`Full Godot output: ${result.logPath}`] : []),
        ],
        fix: ['Reinstall the addon: npx @satelliteoflove/godot-mcp --install-addon <project>. If the error names a file outside addons/godot_mcp, fix that script first.'],
    };
}
// --------------------------------------------------------- export templates
const TEMPLATE_PLATFORMS = [
    { name: 'windows', file: /^windows_release_x86_64\.exe$/ },
    { name: 'linux', file: /^linux_release\.x86_64$/ },
    { name: 'macos', file: /^macos\.zip$/ },
    { name: 'web', file: /^web_release\.zip$/ },
    { name: 'android', file: /^android_release\.apk$/ },
    { name: 'ios', file: /^ios\.zip$/ },
];
/** `4.6.1.stable.official.14d19694e` -> `4.6.1.stable`, the export-templates folder name. */
export function templateVersionDir(fullVersion) {
    return fullVersion.match(/^(\d+\.\d+(?:\.\d+)?\.(?:stable|rc\d*|beta\d*|alpha\d*|dev\d*))/)?.[1];
}
export function exportTemplatesRoot(platform, env = process.env, home = homedir()) {
    if (platform === 'win32')
        return join(env.APPDATA ?? join(home, 'AppData', 'Roaming'), 'Godot', 'export_templates');
    if (platform === 'darwin')
        return join(home, 'Library', 'Application Support', 'Godot', 'export_templates');
    return join(env.XDG_DATA_HOME ?? join(home, '.local', 'share'), 'godot', 'export_templates');
}
export function checkExportTemplates(fullVersion, platform = process.platform, env = process.env, home = homedir()) {
    const versionDir = templateVersionDir(fullVersion);
    if (!versionDir) {
        return { id: 'export_templates', status: 'skip', title: `Could not derive the export-template folder from Godot version "${fullVersion}"` };
    }
    const dir = join(exportTemplatesRoot(platform, env, home), versionDir);
    const tag = versionDir.replace(/\.(stable|rc\d*|beta\d*|alpha\d*|dev\d*)$/, '-$1');
    const url = `https://github.com/godotengine/godot/releases/download/${tag}/Godot_v${tag}_export_templates.tpz`;
    if (!existsSync(dir)) {
        return {
            id: 'export_templates',
            status: 'warn',
            title: `No export templates for Godot ${versionDir}; exports will fail`,
            detail: [`Expected at ${dir}`],
            fix: ['In the editor: Editor > Manage Export Templates > Download and Install.', `Or download ${url} and install it from that dialog.`],
        };
    }
    const files = readdirSync(dir);
    const present = TEMPLATE_PLATFORMS.filter((p) => files.some((f) => p.file.test(f))).map((p) => p.name);
    const missing = TEMPLATE_PLATFORMS.filter((p) => !present.includes(p.name)).map((p) => p.name);
    if (present.length === 0) {
        return {
            id: 'export_templates',
            status: 'warn',
            title: `Export template folder for ${versionDir} exists but holds no release templates`,
            detail: [dir],
            fix: ['In the editor: Editor > Manage Export Templates > Download and Install.', `Or download ${url}.`],
        };
    }
    return {
        id: 'export_templates',
        status: 'ok',
        title: `Export templates ${versionDir}: ${present.join(', ')}${missing.length > 0 ? ` (missing: ${missing.join(', ')})` : ''}`,
        detail: [dir],
    };
}
//# sourceMappingURL=checks.js.map
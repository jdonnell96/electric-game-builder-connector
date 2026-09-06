import { z } from 'zod';
import { defineTool } from '../core/define-tool.js';
import { structured } from '../core/structured.js';
import { staleAdvisory } from '../utils/project-staleness.js';
import { GodotCommandError } from '../utils/errors.js';
import { timeoutHint } from '../doctor/run.js';
function toImageContent(base64) {
    return {
        type: 'image',
        data: base64,
        mimeType: 'image/png',
    };
}
const SCREENSHOT_COST_NOTE = 'Maximum width in pixels (default: 900). Cost scales with resolution (~1 visual token per 28x28px patch; a 900px 16:9 frame ≈ 600 tokens, a native 1080p frame ≈ 2700 on Opus). 640 is the legibility floor for chip-dense UI — still crisp; 512 is the edge and 384 breaks fine print — so drop toward 640 to roughly halve per-frame cost when you do not need the finest text, and raise above 900 only when detail is genuinely unreadable.';
// A screenshot that cannot be taken must say why in terms the caller can act
// on. The addon's codes are terse; each maps to the situation behind it, and a
// timeout carries the port-6007 diagnosis because that is what it usually is.
async function explainScreenshotFailure(error) {
    if (!(error instanceof GodotCommandError))
        return error;
    switch (error.code) {
        case 'NOT_RUNNING':
            return new GodotCommandError(error.code, 'No game is running, so there is no frame to capture. Start it with godot_editor_edit run (frozen: true for a deterministic first frame), then call screenshot.');
        case 'NO_SESSION':
            return new GodotCommandError(error.code, 'A game is running but the editor has no debug session with it, so its framebuffer cannot be read. Either the MCPGameBridge autoload is missing from project.godot (open the project once with the plugin enabled, or run godot_doctor), or the game was not launched from this editor.');
        case 'TIMEOUT':
            return new GodotCommandError(error.code, `The running game did not answer the screenshot request in time. ${error.message}${await timeoutHint()}`);
        default:
            return error;
    }
}
const EditorReadSchema = z.discriminatedUnion('action', [
    z.object({ action: z.literal('get_state').describe('Get editor state: current scene, play state, version, camera, viewport') }),
    z.object({ action: z.literal('get_selection').describe('Get the currently selected nodes') }),
    z.object({
        action: z
            .literal('get_log_messages')
            .describe('Get errors and warnings from the EDITOR process - @tool script runtime errors, import failures, addon errors, and failures from editor-side operations (scene/resource edits, reloads). This is the feedback channel for editor-side changes: run it after a mutation to confirm it did not break the editor. It does NOT include errors from the running game - for those, use minimal-godot-mcp\'s get_console_output (game console via DAP). Filter by severity (errors-only = "did my change break the editor?") and use `since`/`cursor` to read only what is new; every response returns the current `cursor`, even when empty.'),
        clear: z.boolean().optional().describe('Clear the editor error buffer after reading'),
        limit: z.number().int().positive().optional().describe('Maximum number of messages to return (default: 50)'),
        severity: z
            .enum(['all', 'error', 'warning'])
            .optional()
            .describe('Filter by severity: "error" drops warnings (the "did anything actually break?" check), "warning" returns only warnings, "all" (default) returns both.'),
        since: z
            .number()
            .int()
            .nonnegative()
            .optional()
            .describe('Return only messages newer than this cursor. Pass back the `cursor` from a prior response to see just what is new since then - the incremental check that avoids re-reading the whole buffer (0/omitted = from the beginning).'),
    }),
    z.object({ action: z.literal('get_stack_trace').describe('Get the most recent error stack trace') }),
    z.object({
        action: z
            .literal('screenshot')
            .describe('Capture a lossless PNG of the RUNNING GAME\'s framebuffer, the frame the player would see right now, or fail with the reason (no game running, no debug session, debugger channel blocked). Never an editor viewport. Each frame persists in context every later turn and never decays, so reserve it for genuine APPEARANCE judgments (spacing, color, art, "does it look right"). For STRUCTURE or state — which control is focused, a label\'s text, whether a panel is visible, a node\'s anchors/size — read cheap text instead: godot_node_read (scene tree, node properties) or godot_runtime_state digest (live values), both ~free versus the hundreds of visual tokens a frame costs. Do not re-shoot a view that has not changed.'),
        max_width: z.number().int().optional().describe(SCREENSHOT_COST_NOTE),
    }),
    z.object({
        action: z.literal('screenshot_game').describe('Older name for screenshot; identical.'),
        max_width: z.number().int().optional().describe(SCREENSHOT_COST_NOTE),
    }),
    z.object({
        action: z
            .literal('capture_editor_viewport')
            .describe('NOT the running game. A render of the editor\'s design-time 2D or 3D canvas, redrawn on request: the scene as it sits in the editor, with editor gizmos and grid, without runtime state, spawned nodes, animation, or the game camera. Use it only to check editor-side layout; to see what a player sees, run the game and call screenshot. Same context cost as screenshot, so prefer godot_node_read for structure.'),
        viewport: z.enum(['2d', '3d']).optional().describe('Which editor canvas to render (default: whichever main-screen tab is active)'),
        max_width: z.number().int().optional().describe(SCREENSHOT_COST_NOTE),
    }),
]);
const EditorEditSchema = z
    .discriminatedUnion('action', [
    z.object({
        action: z.literal('select').describe('Select a node in the editor'),
        node_path: z.string().describe('Path to node to select'),
    }),
    z.object({
        action: z.literal('run').describe('Run the project'),
        scene_path: z.string().optional().describe('Scene to run (optional, defaults to main scene)'),
        frozen: z
            .boolean()
            .optional()
            .describe('Launch with game time frozen from frame 0 (gameplay never starts racing your latency). Use godot_game_time step/thaw to advance.'),
    }),
    z.object({ action: z.literal('stop').describe('Stop the running project') }),
    z.object({
        action: z
            .literal('restart')
            .describe('Restart the editor, reloading project.godot (autoloads, input map), addon code, and plugins from disk. Use it for EDITOR-side staleness only: edited @tool/addon/plugin code, changed autoloads or input map, or a .gdshader the editor still renders from a cached compile. NOT needed to test edited gameplay scripts — a launched game loads .gd/.tscn fresh from disk, so godot_editor_edit stop then run already runs the new code. Fire-and-forget: the bridge drops and auto-reconnects within a few seconds. Does not start a cold editor - the editor must already be running.'),
        save: z
            .boolean()
            .optional()
            .describe('Save the project before restarting (default: true). Set false to discard unsaved editor changes.'),
    }),
    z.object({
        action: z
            .literal('rescan')
            .describe('Rescan the project filesystem so the editor imports assets written to disk outside the editor (textures, audio, fonts, .tres) without a restart. Do this after writing a new asset and before opening or reloading a scene that references it; otherwise the resource loads empty because no .import exists yet. Returns once the scan and its imports have finished.'),
        paths: z
            .array(z.string())
            .optional()
            .describe('res:// paths of existing assets to force through reimport after the scan (for assets whose bytes changed on disk).'),
    }),
    z.object({
        action: z
            .literal('set_viewport_2d')
            .describe('Center and/or zoom the 2D editor viewport. Pass at least one parameter; omitted parameters PRESERVE the current view (e.g. pass only zoom to zoom in on the current center). The addon reads the live viewport transform to fill in whatever you leave out.'),
        center_x: z.number().optional().describe('X coordinate to center the 2D viewport on (omitted = keep current X)'),
        center_y: z.number().optional().describe('Y coordinate to center the 2D viewport on (omitted = keep current Y)'),
        zoom: z.number().positive().optional().describe('Zoom level, e.g. 1.0 = 100%, 2.0 = 200% (omitted = keep current zoom)'),
    }),
])
    // Constraint a discriminated union can't express on its own, so it lives here:
    .refine((data) => data.action === 'set_viewport_2d'
    ? data.center_x !== undefined || data.center_y !== undefined || data.zoom !== undefined
    : true, { message: 'set_viewport_2d requires at least one of center_x, center_y, or zoom' });
export const editorRead = defineTool({
    name: 'godot_editor_read',
    annotations: { title: 'Editor Control (read)', readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    description: 'Observe the editor and running game: get editor state (open scene, play state, camera, viewport), read the current node selection, pull editor log messages (with an incremental cursor) and stack traces, and capture a lossless PNG of the running game (screenshot: the real framebuffer, or an error that says why) or of the editor\'s design-time canvas (capture_editor_viewport, clearly labelled, never a game frame). Reach for it to check what the editor sees before and after a change; screenshot needs a running game, while every other action works in the bare editor. It changes nothing - to select nodes, run/stop/restart, or move the 2D viewport use godot_editor_edit; errors from the running game (not the editor process) come via minimal-godot-mcp\'s get_console_output when that companion server is installed.',
    schema: EditorReadSchema,
    async execute(args, { godot }) {
        switch (args.action) {
            case 'get_state': {
                const result = await godot.sendCommand('get_editor_state');
                return structured(result);
            }
            case 'get_selection': {
                const result = await godot.sendCommand('get_selected_nodes');
                if (result.selected.length === 0) {
                    return 'No nodes selected';
                }
                return `Selected nodes:\n${result.selected.map((p) => `  - ${p}`).join('\n')}`;
            }
            case 'get_log_messages': {
                const result = await godot.sendCommand('get_log_messages', {
                    clear: args.clear ?? false,
                    limit: args.limit ?? 50,
                    severity: args.severity ?? 'all',
                    since: args.since ?? 0,
                });
                // Surface a stale-project advisory whether or not any log lines matched:
                // when stale, the phantom "Identifier not found" errors that mislead the
                // caller live in this very buffer, so the fix belongs in the same reply.
                const advisory = staleAdvisory(result.staleness);
                if (result.returned_count === 0) {
                    // Nothing matched - but always hand back the cursor so the caller can
                    // start (or continue) incremental reads from here. Without it, the
                    // common "first check after a clean run" case would have no cursor to
                    // poll from and would fall back to re-reading the whole buffer.
                    const sev = args.severity && args.severity !== 'all' ? `${args.severity} ` : '';
                    const base = args.since !== undefined
                        ? `No new ${sev}messages since cursor ${result.cursor}.`
                        : `No ${sev}messages (cursor ${result.cursor}).`;
                    return advisory ? `${base}\n${advisory}` : base;
                }
                return advisory ? structured({ ...result, advisory }) : structured(result);
            }
            case 'get_stack_trace': {
                const result = await godot.sendCommand('get_stack_trace');
                if (!result.error && result.frames.length === 0) {
                    return 'No stack trace available';
                }
                return structured(result);
            }
            case 'screenshot':
            case 'screenshot_game': {
                let result;
                try {
                    result = await godot.sendCommand('capture_game_screenshot', { max_width: args.max_width });
                }
                catch (error) {
                    throw await explainScreenshotFailure(error);
                }
                const image = toImageContent(result.image_base64);
                // Mesh-integrity advisory: corrupt procedural meshes render as "too
                // dark / invisible" with NO error anywhere, so an agent's first
                // hypothesis is lighting and it tunes instead of validating. The
                // warnings ride the screenshot response itself (no extra round-trip,
                // no version-skew timeout) — the moment the agent LOOKS at the game
                // is the moment they are actionable.
                const warnings = result.mesh_warnings ?? [];
                if (warnings.length > 0) {
                    return [
                        image,
                        {
                            type: 'text',
                            text: `⚠ Mesh integrity: ${warnings.join(' | ')}. ` +
                                'If the render looks wrong, this is likely why — run godot_validate_meshes for causes and fixes before tuning lights/materials.',
                        },
                    ];
                }
                return image;
            }
            case 'capture_editor_viewport': {
                const result = await godot.sendCommand('capture_editor_screenshot', { viewport: args.viewport, max_width: args.max_width });
                // The label travels with the image so it can never be mistaken for a
                // game frame later in the context, where only the picture remains.
                const which = result.viewport ?? args.viewport ?? 'active';
                const scene = result.scene ? ` of ${result.scene}` : '';
                return [
                    {
                        type: 'text',
                        text: `Editor design view (${which} canvas${scene}), NOT the running game: editor gizmos are drawn, runtime state and spawned nodes are absent. For what a player sees, run the game and call screenshot.`,
                    },
                    toImageContent(result.image_base64),
                ];
            }
        }
    },
});
export const editorEdit = defineTool({
    name: 'godot_editor_edit',
    annotations: { title: 'Editor Control (edit)', readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    description: 'Drive the editor: select a node, run or stop the project, restart the editor, rescan the filesystem to import assets written outside the editor, and center/zoom the 2D viewport. Use run with frozen=true as the deterministic-playtest entry point (game time holds at frame 0 until godot_game_time steps or thaws it). To test edited gameplay scripts just stop then run — the launched game loads .gd/.tscn fresh from disk; reserve restart for EDITOR-side staleness (edited @tool/addon code, a stale project.godot, or a cached .gdshader). For observation only (state, selection, logs, screenshots) use godot_editor_read instead; restart does not start a cold editor, so one must already be running.',
    schema: EditorEditSchema,
    async execute(args, { godot }) {
        switch (args.action) {
            case 'select': {
                await godot.sendCommand('select_node', { node_path: args.node_path });
                return `Selected node: ${args.node_path}`;
            }
            case 'run': {
                await godot.sendCommand('run_project', { scene_path: args.scene_path, frozen: args.frozen });
                const target = args.scene_path ? `scene: ${args.scene_path}` : 'project';
                return args.frozen
                    ? `Running ${target} frozen from frame 0 — use godot_game_time step/thaw to advance`
                    : `Running ${target}`;
            }
            case 'stop': {
                await godot.sendCommand('stop_project');
                return 'Stopped project';
            }
            case 'restart': {
                const save = args.save ?? true;
                // Restarting tears down the bridge, so this is fire-and-forget: send the
                // request and tolerate the connection dropping before the ack returns.
                // The connection auto-reconnects once the editor is back. A drop here is
                // the expected outcome; anything else (not connected to begin with, or an
                // older addon that doesn't know the command) is a real failure.
                try {
                    await godot.sendCommand('restart_editor', { save });
                }
                catch (err) {
                    const message = err instanceof Error ? err.message : String(err);
                    if (!message.includes('Connection closed')) {
                        throw err;
                    }
                }
                return `Editor is restarting${save ? ' (project saved first)' : ' without saving'}. The bridge reconnects automatically in a few seconds - retry your next command then.`;
            }
            case 'rescan': {
                const result = await godot.sendCommand('rescan_filesystem', { paths: args.paths ?? [] }, { timeoutMs: 90_000 });
                const reimported = result.reimported.length > 0 ? `; reimported ${result.reimported.join(', ')}` : '';
                return `Filesystem rescanned in ${result.duration_ms}ms${reimported}`;
            }
            case 'set_viewport_2d': {
                // Forward only the parameters the caller actually set; the addon
                // preserves the current view for any axis we omit (so a zoom-only call
                // keeps the current center instead of recentering on 0,0).
                const params = {};
                if (args.center_x !== undefined)
                    params.center_x = args.center_x;
                if (args.center_y !== undefined)
                    params.center_y = args.center_y;
                if (args.zoom !== undefined)
                    params.zoom = args.zoom;
                const result = await godot.sendCommand('set_2d_viewport', params);
                return `2D viewport set to center (${result.center.x.toFixed(1)}, ${result.center.y.toFixed(1)}) at ${result.zoom.toFixed(2)}x zoom`;
            }
        }
    },
});
export const editorTools = [editorRead, editorEdit];
//# sourceMappingURL=editor.js.map
import { z } from 'zod';
import { defineTool } from '../core/define-tool.js';
const Vector3Schema = z.object({
    x: z.number(),
    y: z.number(),
    z: z.number(),
});
const AABBInputSchema = z.object({
    position: Vector3Schema.describe('Min corner of the AABB'),
    size: Vector3Schema.describe('Size of the AABB'),
});
const Scene3DSchema = z.discriminatedUnion('action', [
    z.object({
        action: z.literal('get_spatial_info').describe('Get spatial data for a Node3D and optionally its children'),
        node_path: z.string().describe('Path to the Node3D'),
        include_children: z
            .boolean()
            .optional()
            .default(false)
            .describe('Include child nodes'),
        type_filter: z
            .string()
            .optional()
            .describe('Filter by node type, e.g. "MeshInstance3D"'),
        max_results: z
            .number()
            .int()
            .positive()
            .optional()
            .describe('Limit number of results. Defaults to 50 when include_children=true. Set higher (e.g., 500) if needed.'),
        within_aabb: AABBInputSchema.optional().describe('Only include nodes whose global position is within this AABB'),
    }),
    z.object({
        action: z.literal('get_bounds').describe('Get the combined AABB of a subtree (VisualInstance3D and GridMap nodes)'),
        root_path: z
            .string()
            .optional()
            .describe('Path to search root (defaults to scene root)'),
    }),
]);
function formatVector3(v) {
    return `(${v.x.toFixed(3)}, ${v.y.toFixed(3)}, ${v.z.toFixed(3)})`;
}
function formatAABB(aabb) {
    return `pos: ${formatVector3(aabb.position)}, size: ${formatVector3(aabb.size)}`;
}
export const scene3d = defineTool({
    name: 'godot_scene3d',
    annotations: { title: '3D Scene Info', readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    description: 'Read engine-computed 3D spatial data that cannot be derived from .tscn text: global transforms resolved through the parent chain, mesh AABBs (VisualInstance3D, and GridMap folded from its placed cells), combined subtree bounds, and visibility. Use get_spatial_info for one Node3D or a filtered set of its children (by type or world-space region); use get_bounds for the combined AABB of a subtree. Read-only: to change transforms or other properties, use godot_node_edit.',
    schema: Scene3DSchema,
    async execute(args, { godot }) {
        switch (args.action) {
            case 'get_spatial_info': {
                const DEFAULT_LIMIT = 50;
                let effectiveLimit = args.max_results;
                if (effectiveLimit === undefined && args.include_children) {
                    effectiveLimit = DEFAULT_LIMIT;
                }
                const result = await godot.sendCommand('get_spatial_info', {
                    node_path: args.node_path,
                    include_children: args.include_children,
                    type_filter: args.type_filter,
                    max_results: effectiveLimit,
                    within_aabb: args.within_aabb,
                });
                if (result.count === 0) {
                    return 'No matching Node3D nodes found';
                }
                const lines = result.nodes.map((n) => {
                    let line = `${n.path} (${n.type})\n`;
                    line += `  position: ${formatVector3(n.global_position)}\n`;
                    line += `  rotation: ${formatVector3(n.global_rotation)} rad\n`;
                    line += `  scale: ${formatVector3(n.global_scale)}\n`;
                    line += `  visible: ${n.visible}`;
                    if (n.aabb) {
                        line += `\n  aabb: ${formatAABB(n.aabb)}`;
                    }
                    if (n.global_aabb) {
                        line += `\n  global_aabb: ${formatAABB(n.global_aabb)}`;
                    }
                    return line;
                });
                let output = `Found ${result.count} Node3D node(s):\n\n${lines.join('\n\n')}`;
                if (result.truncated) {
                    const limitNote = args.max_results === undefined
                        ? ` Set max_results higher (e.g., 100 or 500) to see more.`
                        : '';
                    output += `\n\n(Results truncated at ${result.max_results}.${limitNote})`;
                }
                return output;
            }
            case 'get_bounds': {
                const result = await godot.sendCommand('get_scene_bounds', {
                    root_path: args.root_path,
                });
                return (`Scene bounds for ${result.root_path}:\n` +
                    `  Visual nodes: ${result.node_count}\n` +
                    `  Combined AABB: ${formatAABB(result.combined_aabb)}\n` +
                    `  Min: ${formatVector3(result.combined_aabb.position)}\n` +
                    `  Max: ${formatVector3(result.combined_aabb.end)}`);
            }
        }
    },
});
export const scene3dTools = [scene3d];
//# sourceMappingURL=scene3d.js.map
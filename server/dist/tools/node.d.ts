import { z } from 'zod';
import type { AnyToolDefinition } from '../core/types.js';
export declare const nodeRead: import("../core/types.js").ToolDefinition<z.ZodDiscriminatedUnion<[z.ZodObject<{
    action: z.ZodLiteral<"get_properties">;
    node_path: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"get_scene_tree">;
    max_depth: z.ZodOptional<z.ZodNumber>;
    max_children: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"find">;
    name_pattern: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodString>;
    root_path: z.ZodOptional<z.ZodString>;
}, z.core.$strip>], "action">>;
export declare const nodeEdit: import("../core/types.js").ToolDefinition<z.ZodDiscriminatedUnion<[z.ZodObject<{
    action: z.ZodLiteral<"update">;
    node_path: z.ZodString;
    properties: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"reparent">;
    node_path: z.ZodString;
    new_parent_path: z.ZodString;
}, z.core.$strip>], "action">>;
export declare const nodeTools: AnyToolDefinition[];
//# sourceMappingURL=node.d.ts.map
import { z } from 'zod';
import type { AnyToolDefinition } from '../core/types.js';
export declare const editorRead: import("../core/types.js").ToolDefinition<z.ZodDiscriminatedUnion<[z.ZodObject<{
    action: z.ZodLiteral<"get_state">;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"get_selection">;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"get_log_messages">;
    clear: z.ZodOptional<z.ZodBoolean>;
    limit: z.ZodOptional<z.ZodNumber>;
    severity: z.ZodOptional<z.ZodEnum<{
        all: "all";
        error: "error";
        warning: "warning";
    }>>;
    since: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"get_stack_trace">;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"screenshot">;
    max_width: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"screenshot_game">;
    max_width: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"capture_editor_viewport">;
    viewport: z.ZodOptional<z.ZodEnum<{
        "2d": "2d";
        "3d": "3d";
    }>>;
    max_width: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>], "action">>;
export declare const editorEdit: import("../core/types.js").ToolDefinition<z.ZodDiscriminatedUnion<[z.ZodObject<{
    action: z.ZodLiteral<"select">;
    node_path: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"run">;
    scene_path: z.ZodOptional<z.ZodString>;
    frozen: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"stop">;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"restart">;
    save: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"rescan">;
    paths: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"set_viewport_2d">;
    center_x: z.ZodOptional<z.ZodNumber>;
    center_y: z.ZodOptional<z.ZodNumber>;
    zoom: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>], "action">>;
export declare const editorTools: AnyToolDefinition[];
//# sourceMappingURL=editor.d.ts.map
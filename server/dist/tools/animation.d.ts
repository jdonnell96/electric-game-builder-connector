import { z } from 'zod';
import type { AnyToolDefinition } from '../core/types.js';
export declare const animationRead: import("../core/types.js").ToolDefinition<z.ZodDiscriminatedUnion<[z.ZodObject<{
    action: z.ZodLiteral<"list_players">;
    root_path: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"get_info">;
    node_path: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"get_details">;
    node_path: z.ZodString;
    animation_name: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"get_keyframes">;
    node_path: z.ZodString;
    animation_name: z.ZodString;
    track_index: z.ZodNumber;
}, z.core.$strip>], "action">>;
export declare const animationEdit: import("../core/types.js").ToolDefinition<z.ZodDiscriminatedUnion<[z.ZodObject<{
    action: z.ZodLiteral<"play">;
    node_path: z.ZodString;
    animation_name: z.ZodString;
    custom_blend: z.ZodOptional<z.ZodNumber>;
    custom_speed: z.ZodOptional<z.ZodNumber>;
    from_end: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"stop">;
    node_path: z.ZodString;
    keep_state: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"seek">;
    node_path: z.ZodString;
    seconds: z.ZodNumber;
    update: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"create">;
    node_path: z.ZodString;
    animation_name: z.ZodString;
    library_name: z.ZodOptional<z.ZodString>;
    length: z.ZodOptional<z.ZodNumber>;
    loop_mode: z.ZodOptional<z.ZodEnum<{
        linear: "linear";
        none: "none";
        pingpong: "pingpong";
    }>>;
    step: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"delete">;
    node_path: z.ZodString;
    animation_name: z.ZodString;
    library_name: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"update_props">;
    node_path: z.ZodString;
    animation_name: z.ZodString;
    length: z.ZodOptional<z.ZodNumber>;
    loop_mode: z.ZodOptional<z.ZodEnum<{
        linear: "linear";
        none: "none";
        pingpong: "pingpong";
    }>>;
    step: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"add_track">;
    node_path: z.ZodString;
    animation_name: z.ZodString;
    track_type: z.ZodEnum<{
        animation: "animation";
        audio: "audio";
        bezier: "bezier";
        blend_shape: "blend_shape";
        method: "method";
        position_3d: "position_3d";
        rotation_3d: "rotation_3d";
        scale_3d: "scale_3d";
        value: "value";
    }>;
    track_path: z.ZodString;
    insert_at: z.ZodOptional<z.ZodNumber>;
    create_reset: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"create_reset_keys">;
    node_path: z.ZodString;
    animation_name: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"remove_track">;
    node_path: z.ZodString;
    animation_name: z.ZodString;
    track_index: z.ZodNumber;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"add_keyframe">;
    node_path: z.ZodString;
    animation_name: z.ZodString;
    track_index: z.ZodNumber;
    time: z.ZodNumber;
    value: z.ZodOptional<z.ZodUnknown>;
    transition: z.ZodOptional<z.ZodNumber>;
    method_name: z.ZodOptional<z.ZodString>;
    args: z.ZodOptional<z.ZodArray<z.ZodUnknown>>;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"remove_keyframe">;
    node_path: z.ZodString;
    animation_name: z.ZodString;
    track_index: z.ZodNumber;
    keyframe_index: z.ZodNumber;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"update_keyframe">;
    node_path: z.ZodString;
    animation_name: z.ZodString;
    track_index: z.ZodNumber;
    keyframe_index: z.ZodNumber;
    time: z.ZodOptional<z.ZodNumber>;
    value: z.ZodOptional<z.ZodUnknown>;
    transition: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>], "action">>;
export declare const animationTools: AnyToolDefinition[];
//# sourceMappingURL=animation.d.ts.map
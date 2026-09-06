import { z } from 'zod';
import type { AnyToolDefinition } from '../core/types.js';
export declare const scene: import("../core/types.js").ToolDefinition<z.ZodDiscriminatedUnion<[z.ZodObject<{
    action: z.ZodLiteral<"open">;
    scene_path: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"save">;
    scene_path: z.ZodOptional<z.ZodString>;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"reload">;
    scene_path: z.ZodOptional<z.ZodString>;
}, z.core.$strip>], "action">>;
export declare const sceneTools: AnyToolDefinition[];
//# sourceMappingURL=scene.d.ts.map
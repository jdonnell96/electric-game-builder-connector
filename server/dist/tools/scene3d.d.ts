import { z } from 'zod';
import type { AnyToolDefinition } from '../core/types.js';
export declare const scene3d: import("../core/types.js").ToolDefinition<z.ZodDiscriminatedUnion<[z.ZodObject<{
    action: z.ZodLiteral<"get_spatial_info">;
    node_path: z.ZodString;
    include_children: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    type_filter: z.ZodOptional<z.ZodString>;
    max_results: z.ZodOptional<z.ZodNumber>;
    within_aabb: z.ZodOptional<z.ZodObject<{
        position: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
            z: z.ZodNumber;
        }, z.core.$strip>;
        size: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
            z: z.ZodNumber;
        }, z.core.$strip>;
    }, z.core.$strip>>;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"get_bounds">;
    root_path: z.ZodOptional<z.ZodString>;
}, z.core.$strip>], "action">>;
export declare const scene3dTools: AnyToolDefinition[];
//# sourceMappingURL=scene3d.d.ts.map
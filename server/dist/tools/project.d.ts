import { z } from 'zod';
import type { AnyToolDefinition } from '../core/types.js';
export declare const project: import("../core/types.js").ToolDefinition<z.ZodDiscriminatedUnion<[z.ZodObject<{
    action: z.ZodLiteral<"get_info">;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"get_settings">;
    category: z.ZodOptional<z.ZodString>;
    include_builtin: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"addon_status">;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"check_stale">;
}, z.core.$strip>], "action">>;
export declare const projectTools: AnyToolDefinition[];
//# sourceMappingURL=project.d.ts.map
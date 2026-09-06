import { z } from 'zod';
import type { AnyToolDefinition } from '../core/types.js';
export declare const resource: import("../core/types.js").ToolDefinition<z.ZodDiscriminatedUnion<[z.ZodObject<{
    action: z.ZodLiteral<"get_info">;
    resource_path: z.ZodString;
    max_depth: z.ZodOptional<z.ZodNumber>;
    include_internal: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>], "action">>;
export declare const resourceTools: AnyToolDefinition[];
//# sourceMappingURL=resource.d.ts.map
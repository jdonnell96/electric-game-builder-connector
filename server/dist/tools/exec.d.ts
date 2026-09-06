import { z } from 'zod';
import type { AnyToolDefinition } from '../core/types.js';
export declare const exec: import("../core/types.js").ToolDefinition<z.ZodDiscriminatedUnion<[z.ZodObject<{
    action: z.ZodLiteral<"run">;
    source: z.ZodString;
    budget_ms: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"list">;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"remove">;
    name: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"clear">;
}, z.core.$strip>], "action">>;
export declare const execTools: AnyToolDefinition[];
//# sourceMappingURL=exec.d.ts.map
import { z } from 'zod';
import type { AnyToolDefinition } from '../core/types.js';
export declare const runTestsTool: import("../core/types.js").ToolDefinition<z.ZodDiscriminatedUnion<[z.ZodObject<{
    action: z.ZodLiteral<"run">;
    target: z.ZodString;
    project_path: z.ZodOptional<z.ZodString>;
    args: z.ZodOptional<z.ZodArray<z.ZodString>>;
    timeout_ms: z.ZodOptional<z.ZodNumber>;
    godot: z.ZodOptional<z.ZodString>;
}, z.core.$strip>], "action">>;
export declare const runTestsTools: AnyToolDefinition[];
//# sourceMappingURL=run-tests.d.ts.map
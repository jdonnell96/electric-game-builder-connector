import { z } from 'zod';
import type { AnyToolDefinition } from '../core/types.js';
export declare const doctor: import("../core/types.js").ToolDefinition<z.ZodDiscriminatedUnion<[z.ZodObject<{
    action: z.ZodLiteral<"run">;
    project_path: z.ZodOptional<z.ZodString>;
    skip_compile_check: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>], "action">>;
export declare const doctorTools: AnyToolDefinition[];
//# sourceMappingURL=doctor.d.ts.map
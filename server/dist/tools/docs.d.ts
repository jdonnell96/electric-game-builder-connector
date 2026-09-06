import { z } from 'zod';
import type { AnyToolDefinition } from '../core/types.js';
export declare const docs: import("../core/types.js").ToolDefinition<z.ZodDiscriminatedUnion<[z.ZodObject<{
    action: z.ZodLiteral<"fetch_class">;
    class_name: z.ZodString;
    version: z.ZodOptional<z.ZodEnum<{
        4.2: "4.2";
        4.3: "4.3";
        4.4: "4.4";
        4.5: "4.5";
        latest: "latest";
        stable: "stable";
    }>>;
    section: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        description: "description";
        full: "full";
        methods: "methods";
        properties: "properties";
        signals: "signals";
    }>>>;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"fetch_page">;
    path: z.ZodString;
    version: z.ZodOptional<z.ZodEnum<{
        4.2: "4.2";
        4.3: "4.3";
        4.4: "4.4";
        4.5: "4.5";
        latest: "latest";
        stable: "stable";
    }>>;
}, z.core.$strip>], "action">>;
export declare const docsTools: AnyToolDefinition[];
//# sourceMappingURL=docs.d.ts.map
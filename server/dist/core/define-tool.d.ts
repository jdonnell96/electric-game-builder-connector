import type { z } from 'zod';
import type { ToolDefinition, ToolContext, ToolExecuteResult, ToolAnnotations } from './types.js';
export declare function defineTool<TSchema extends z.ZodType>(config: {
    name: string;
    description: string;
    annotations?: ToolAnnotations;
    schema: TSchema;
    execute: (args: z.infer<TSchema>, ctx: ToolContext) => Promise<ToolExecuteResult>;
}): ToolDefinition<TSchema>;
//# sourceMappingURL=define-tool.d.ts.map
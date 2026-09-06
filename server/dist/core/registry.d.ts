import type { AnyToolDefinition, ToolAnnotations, ToolContext, ToolExecuteResult } from './types.js';
declare class ToolRegistry {
    private tools;
    registerTool(tool: AnyToolDefinition): void;
    registerTools(tools: AnyToolDefinition[]): void;
    getToolList(): Array<{
        name: string;
        description: string;
        inputSchema: object;
        annotations?: ToolAnnotations;
    }>;
    executeTool(name: string, args: Record<string, unknown>, ctx: ToolContext): Promise<ToolExecuteResult>;
}
export declare const registry: ToolRegistry;
export {};
//# sourceMappingURL=registry.d.ts.map
import type { z } from 'zod';
import type { GodotConnection } from '../connection/websocket.js';
export interface ToolContext {
    godot: GodotConnection;
}
export type TextContent = {
    type: 'text';
    text: string;
};
export type ImageContent = {
    type: 'image';
    data: string;
    mimeType: string;
};
export type ToolResult = TextContent | ImageContent;
export interface StructuredToolResult {
    text: string;
    structuredContent: Record<string, unknown>;
}
export type MultiContentResult = ToolResult[];
export type ToolExecuteResult = string | ToolResult | MultiContentResult | StructuredToolResult;
export interface ToolAnnotations {
    title?: string;
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
}
export interface ToolDefinition<TSchema extends z.ZodType = z.ZodType> {
    name: string;
    description: string;
    annotations?: ToolAnnotations;
    schema: TSchema;
    execute: (args: z.infer<TSchema>, ctx: ToolContext) => Promise<ToolExecuteResult>;
}
export interface AnyToolDefinition {
    name: string;
    description: string;
    annotations?: ToolAnnotations;
    schema: z.ZodType;
    execute: (args: unknown, ctx: ToolContext) => Promise<ToolExecuteResult>;
}
export interface Vector3 {
    x: number;
    y: number;
    z: number;
}
//# sourceMappingURL=types.d.ts.map
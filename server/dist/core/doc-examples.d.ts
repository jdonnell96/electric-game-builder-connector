import { z } from 'zod';
import type { AnyToolDefinition } from './types.js';
export interface ActionVariant {
    action: string;
    properties: Record<string, Record<string, unknown>>;
    required: string[];
}
export declare function rawJsonSchema(tool: AnyToolDefinition): Record<string, unknown>;
export declare function getActionVariants(schema: Record<string, unknown>): ActionVariant[] | null;
export declare function exampleForProp(name: string, prop: Record<string, unknown>, toolName?: string): unknown;
export declare function buildVariantExample(variant: ActionVariant, toolSchema: z.ZodType, toolName?: string): Record<string, unknown>;
//# sourceMappingURL=doc-examples.d.ts.map
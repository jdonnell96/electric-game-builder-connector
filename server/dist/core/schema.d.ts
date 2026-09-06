import { z, type ZodType } from 'zod';
export declare function toInputSchema(schema: ZodType): object;
export declare function validActions(schema: ZodType): string[] | null;
export declare function describeValidationError(toolName: string, schema: ZodType, args: Record<string, unknown>, error: z.ZodError): string;
//# sourceMappingURL=schema.d.ts.map
import { z } from 'zod';
export declare const RequestSchema: z.ZodObject<{
    id: z.ZodString;
    command: z.ZodString;
    params: z.ZodDefault<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
}, z.core.$strip>;
export type Request = z.infer<typeof RequestSchema>;
export declare const SuccessResponseSchema: z.ZodObject<{
    id: z.ZodString;
    status: z.ZodLiteral<"success">;
    result: z.ZodUnknown;
}, z.core.$strip>;
export declare const ErrorResponseSchema: z.ZodObject<{
    id: z.ZodString;
    status: z.ZodLiteral<"error">;
    error: z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const ResponseSchema: z.ZodUnion<readonly [z.ZodObject<{
    id: z.ZodString;
    status: z.ZodLiteral<"success">;
    result: z.ZodUnknown;
}, z.core.$strip>, z.ZodObject<{
    id: z.ZodString;
    status: z.ZodLiteral<"error">;
    error: z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>]>;
export type Response = z.infer<typeof ResponseSchema>;
export type SuccessResponse = z.infer<typeof SuccessResponseSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export declare function createRequest(command: string, params?: Record<string, unknown>): Request;
export declare function isSuccessResponse(response: Response): response is SuccessResponse;
export declare function isErrorResponse(response: Response): response is ErrorResponse;
//# sourceMappingURL=protocol.d.ts.map
import { z } from 'zod';
export const RequestSchema = z.object({
    id: z.string(),
    command: z.string(),
    params: z.record(z.string(), z.unknown()).optional().default({}),
});
export const SuccessResponseSchema = z.object({
    id: z.string(),
    status: z.literal('success'),
    result: z.unknown(),
});
export const ErrorResponseSchema = z.object({
    id: z.string(),
    status: z.literal('error'),
    error: z.object({
        code: z.string(),
        message: z.string(),
    }),
});
export const ResponseSchema = z.union([SuccessResponseSchema, ErrorResponseSchema]);
export function createRequest(command, params = {}) {
    return {
        id: crypto.randomUUID(),
        command,
        params,
    };
}
export function isSuccessResponse(response) {
    return response.status === 'success';
}
export function isErrorResponse(response) {
    return response.status === 'error';
}
//# sourceMappingURL=protocol.js.map
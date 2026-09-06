import { z } from 'zod';
import { describeValidationError, toInputSchema } from './schema.js';
import { isStructuredResult } from './structured.js';
import { formatError, GodotCommandError, GodotConnectionError, GodotTimeoutError, } from '../utils/errors.js';
import { logToolUsage, categorizeError, extractErrorCode } from '../utils/usage-logger.js';
class ToolRegistry {
    tools = new Map();
    registerTool(tool) {
        if (this.tools.has(tool.name)) {
            throw new Error(`Tool '${tool.name}' already registered`);
        }
        this.tools.set(tool.name, tool);
    }
    registerTools(tools) {
        tools.forEach((tool) => this.registerTool(tool));
    }
    getToolList() {
        return Array.from(this.tools.values()).map((tool) => ({
            name: tool.name,
            description: tool.description,
            inputSchema: toInputSchema(tool.schema),
            ...(tool.annotations ? { annotations: tool.annotations } : {}),
        }));
    }
    async executeTool(name, args, ctx) {
        const tool = this.tools.get(name);
        if (!tool) {
            throw new Error(`Unknown tool: ${name}`);
        }
        const startTime = performance.now();
        let success = false;
        let responseBytes = 0;
        let errorType;
        let errorCode;
        try {
            const validated = tool.schema.parse(args);
            const result = await tool.execute(validated, ctx);
            success = true;
            const responseText = typeof result === 'string'
                ? result
                : isStructuredResult(result)
                    ? result.text
                    : JSON.stringify(result);
            responseBytes = Buffer.byteLength(responseText, 'utf-8');
            return result;
        }
        catch (error) {
            errorType = categorizeError(error);
            errorCode = extractErrorCode(error);
            if (error instanceof GodotCommandError ||
                error instanceof GodotConnectionError ||
                error instanceof GodotTimeoutError) {
                throw error;
            }
            if (error instanceof z.ZodError) {
                throw new Error(describeValidationError(name, tool.schema, args, error));
            }
            throw new Error(formatError(error));
        }
        finally {
            const durationMs = performance.now() - startTime;
            logToolUsage(name, args, success, durationMs, responseBytes, errorType, errorCode);
        }
    }
}
export const registry = new ToolRegistry();
//# sourceMappingURL=registry.js.map
import { vi } from 'vitest';
export function createMockGodot() {
    const calls = [];
    let nextResponse = {};
    let nextError = null;
    const sendCommand = vi.fn(async (command, params = {}, opts) => {
        calls.push({ command, params, opts });
        if (nextError) {
            const err = nextError;
            nextError = null;
            throw err;
        }
        const response = nextResponse;
        nextResponse = {};
        return response;
    });
    return {
        sendCommand,
        calls,
        mockResponse: (response) => {
            nextResponse = response;
        },
        mockError: (error) => {
            nextError = error;
        },
        godotVersion: null,
    };
}
export function createToolContext(mock) {
    return {
        godot: {
            sendCommand: mock.sendCommand,
            get godotVersion() {
                return mock.godotVersion;
            },
        },
    };
}
// Extract the structured payload from a tool result. Query actions return a
// StructuredToolResult ({ text, structuredContent }); this returns the
// structuredContent. Falls back to parsing a plain JSON-string result.
export function structuredOf(result) {
    if (result &&
        typeof result === 'object' &&
        'structuredContent' in result) {
        return result.structuredContent;
    }
    return JSON.parse(result);
}
//# sourceMappingURL=mock-godot.js.map
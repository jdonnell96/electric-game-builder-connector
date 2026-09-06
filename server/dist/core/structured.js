// Wrap a query payload so the tool result carries both a compact-JSON text
// rendering (the fallback for clients without structured-output support) and
// the object itself as MCP `structuredContent`.
export function structured(data) {
    return {
        text: JSON.stringify(data),
        structuredContent: data,
    };
}
export function isStructuredResult(value) {
    return (typeof value === 'object' &&
        value !== null &&
        'structuredContent' in value &&
        'text' in value);
}
//# sourceMappingURL=structured.js.map
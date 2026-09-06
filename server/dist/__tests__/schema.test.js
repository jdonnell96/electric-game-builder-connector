import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { toInputSchema } from '../core/schema.js';
describe('toInputSchema', () => {
    it('converts object schema with required/optional fields and descriptions', () => {
        const schema = z.object({
            required_field: z.string(),
            optional_field: z.string().optional(),
            path: z.string().describe('The file path'),
        });
        const result = toInputSchema(schema);
        expect(result.type).toBe('object');
        expect(result.required).toContain('required_field');
        expect(result.required).not.toContain('optional_field');
        const props = result.properties;
        expect(props.path.description).toBe('The file path');
    });
    it('converts nested objects and primitive types', () => {
        const schema = z.object({
            enabled: z.boolean(),
            node: z.object({
                name: z.string(),
                type: z.string(),
            }),
        });
        const result = toInputSchema(schema);
        const props = result.properties;
        expect(props.enabled.type).toBe('boolean');
        expect(props.node.type).toBe('object');
        expect(props.node.properties).toHaveProperty('name');
    });
    it('removes $schema property from output', () => {
        const result = toInputSchema(z.object({ test: z.string() }));
        expect(result).not.toHaveProperty('$schema');
    });
});
//# sourceMappingURL=schema.test.js.map
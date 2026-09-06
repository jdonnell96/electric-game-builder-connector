import { describe, it, expect } from 'vitest';
import { toInputSchema } from '../../core/schema.js';
import { nodeRead, nodeEdit } from '../../tools/node.js';
import { animationRead } from '../../tools/animation.js';
import { editorEdit } from '../../tools/editor.js';
const schemaOf = (tool) => toInputSchema(tool.schema);
const actionEnumOf = (schema) => schema.properties.action.enum;
describe('discriminated-union tool schemas', () => {
    it('serialize to a flat object schema with an action enum', () => {
        const schema = schemaOf(nodeRead);
        expect(schema.type).toBe('object');
        const actions = actionEnumOf(schema);
        expect(Array.isArray(actions)).toBe(true);
        expect(actions).toEqual(['get_properties', 'get_scene_tree', 'find']);
    });
    it('keep fields required by every branch as top-level required', () => {
        const schema = schemaOf(nodeEdit);
        // node_path is required by both update and reparent, so it stays required;
        // branch-specific fields surface as optionals with scope markers.
        expect(schema.required).toEqual(['action', 'node_path']);
        const props = schema.properties;
        expect(props).toHaveProperty('new_parent_path');
        expect(props).toHaveProperty('properties');
        expect(props.new_parent_path.description).toContain('(required for: reparent)');
    });
    it('keep residual constraints the union cannot express on its own', () => {
        // node find requires name_pattern and/or type
        expect(nodeRead.schema.safeParse({ action: 'find' }).success).toBe(false);
        expect(nodeRead.schema.safeParse({ action: 'find', type: 'Area2D' }).success).toBe(true);
        // editor set_viewport_2d requires at least one of center_x / center_y / zoom
        expect(editorEdit.schema.safeParse({ action: 'set_viewport_2d' }).success).toBe(false);
        expect(editorEdit.schema.safeParse({ action: 'set_viewport_2d', zoom: 2 }).success).toBe(true);
    });
    it('reject unknown actions', () => {
        expect(animationRead.schema.safeParse({ action: 'not_a_real_action' }).success).toBe(false);
    });
});
//# sourceMappingURL=discriminated-union-schema.test.js.map
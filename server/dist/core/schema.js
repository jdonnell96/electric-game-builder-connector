import { z } from 'zod';
// The Anthropic API forbids oneOf/anyOf/allOf at the root of inputSchema.
// Zod v4's toJSONSchema emits `oneOf` for discriminatedUnion, so we flatten
// all branches into a single object schema. Actual validation still runs
// through Zod when the tool is called.
//
// Flattening loses information the model needs unless we put it back:
// per-branch required fields become optional at the top level, and the
// discriminator literals' .describe() strings vanish with their branches.
// So the discriminator property carries a per-action summary line for each
// branch, and every merged property description gets a "(required for: ...)"
// or "(for: ...)" marker naming the actions it belongs to.
function flattenUnionToObject(schema) {
    // oneOf/anyOf only: allOf is an intersection, where this merge's
    // required-in-every-branch logic would be inverted (union, not intersection,
    // of requireds). No tool uses intersections; reject loudly if one appears.
    const branches = (schema.oneOf ?? schema.anyOf);
    if (!branches || branches.length === 0) {
        return { type: 'object' };
    }
    const propsOf = (b) => (b.properties ?? {});
    const requiredOf = (b) => (Array.isArray(b.required) ? b.required : []);
    // Fields required in every branch stay required at the top level.
    const requiredSets = branches.map(requiredOf);
    const commonRequired = requiredSets[0].filter((k) => requiredSets.every((r) => r.includes(k)));
    // Discriminators: common-required fields with a `const` in every branch
    // (in practice: `action`). Their per-branch const is the branch's label.
    const discriminators = commonRequired.filter((key) => branches.every((b) => propsOf(b)[key]?.const !== undefined));
    const labelKey = discriminators[0];
    const labelOf = (b, i) => labelKey ? String(propsOf(b)[labelKey].const) : `variant ${i + 1}`;
    const appearances = new Map();
    branches.forEach((branch, i) => {
        const label = labelOf(branch, i);
        const required = requiredOf(branch);
        for (const [name, prop] of Object.entries(propsOf(branch))) {
            if (discriminators.includes(name))
                continue;
            const list = appearances.get(name) ?? [];
            list.push({ label, schema: prop, required: required.includes(name) });
            appearances.set(name, list);
        }
    });
    const mergedProperties = {};
    // Discriminator property: enum of branch labels, described by one compact
    // summary line per action (recovered from the action literal's .describe()).
    for (const key of discriminators) {
        const lines = branches.map((b, i) => {
            const desc = propsOf(b)[key].description;
            const label = labelOf(b, i);
            return typeof desc === 'string' && desc.length > 0 ? `${label}: ${desc}` : label;
        });
        mergedProperties[key] = {
            type: 'string',
            enum: branches.map((b, i) => labelOf(b, i)),
            description: lines.join('\n'),
        };
    }
    for (const [name, apps] of appearances) {
        // Base schema: last appearance wins for structure (matches the previous
        // behavior); description is rebuilt below from all appearances.
        const merged = { ...apps[apps.length - 1].schema };
        // Description: single shared text when all appearances agree, otherwise
        // one labeled segment per distinct text so no branch's wording is lost.
        const descs = apps
            .filter((a) => typeof a.schema.description === 'string' && a.schema.description !== '')
            .map((a) => ({ label: a.label, text: a.schema.description }));
        const distinct = [...new Set(descs.map((d) => d.text))];
        let description = distinct.length <= 1
            ? (distinct[0] ?? '')
            : descs.map((d) => `for ${d.label}: ${d.text}`).join('; ');
        // Scope marker: which actions need or accept this field. Skip when the
        // field is required everywhere (it stays in top-level `required`).
        if (!commonRequired.includes(name)) {
            const requiredLabels = apps.filter((a) => a.required).map((a) => a.label);
            const allLabels = apps.map((a) => a.label);
            if (requiredLabels.length > 0) {
                const optionalLabels = allLabels.filter((l) => !requiredLabels.includes(l));
                const marker = optionalLabels.length > 0
                    ? `(required for: ${requiredLabels.join(', ')}; optional for: ${optionalLabels.join(', ')})`
                    : `(required for: ${requiredLabels.join(', ')})`;
                description = description ? `${description} ${marker}` : marker;
            }
            else if (allLabels.length < branches.length) {
                const marker = `(for: ${allLabels.join(', ')})`;
                description = description ? `${description} ${marker}` : marker;
            }
        }
        if (description) {
            merged.description = description;
        }
        mergedProperties[name] = merged;
    }
    return {
        type: 'object',
        ...(Object.keys(mergedProperties).length > 0 ? { properties: mergedProperties } : {}),
        ...(commonRequired.length > 0 ? { required: commonRequired } : {}),
    };
}
// Zod's .int() compiles to ±Number.MAX_SAFE_INTEGER bounds — meaningless to a
// model and noise in every published schema. Strip exactly those sentinels,
// recursively; real bounds (min_width: 1, etc.) stay.
function stripSafeIntSentinels(node) {
    if (Array.isArray(node)) {
        node.forEach(stripSafeIntSentinels);
        return;
    }
    if (node === null || typeof node !== 'object')
        return;
    const obj = node;
    if (obj.minimum === -Number.MAX_SAFE_INTEGER)
        delete obj.minimum;
    if (obj.maximum === Number.MAX_SAFE_INTEGER)
        delete obj.maximum;
    Object.values(obj).forEach(stripSafeIntSentinels);
}
export function toInputSchema(schema) {
    // io: 'input' so fields with .default() publish as optional (the caller may
    // omit them) instead of required-with-a-default, which contradicts itself.
    const jsonSchema = z.toJSONSchema(schema, { target: 'draft-07', io: 'input' });
    const { $schema, ...rest } = jsonSchema;
    stripSafeIntSentinels(rest);
    if (rest.type === 'object')
        return rest;
    if (rest.oneOf || rest.anyOf)
        return flattenUnionToObject(rest);
    if (rest.allOf) {
        throw new Error('intersection (allOf) schemas are not supported for tool inputs');
    }
    // The Anthropic API requires an object root; a non-object schema here is a
    // tool-authoring bug — fail at registration, not silently at the API.
    throw new Error(`tool input schema must have an object root, got: ${JSON.stringify(rest.type)}`);
}
// Names the actions a discriminated-union tool accepts, for error messages.
// Reads the published (flattened) schema so it works for any tool shape.
export function validActions(schema) {
    const flat = toInputSchema(schema);
    const props = flat.properties;
    const actionEnum = props?.action?.enum;
    return Array.isArray(actionEnum) ? actionEnum.map(String) : null;
}
// Required/optional parameter names for one action's branch of a
// discriminated-union schema, or null for non-union schemas.
function branchRequirements(schema, action) {
    const raw = z.toJSONSchema(schema, { target: 'draft-07', io: 'input' });
    const branches = (raw.oneOf ?? raw.anyOf);
    if (!branches)
        return null;
    const branch = branches.find((b) => (b.properties ?? {}).action?.const === action);
    if (!branch)
        return null;
    const props = Object.keys((branch.properties ?? {})).filter((k) => k !== 'action');
    const required = (Array.isArray(branch.required) ? branch.required : []).filter((k) => k !== 'action');
    return { required, optional: props.filter((k) => !required.includes(k)) };
}
// A validation failure the model can act on: names the tool and action, the
// failing fields, and what the action actually accepts — instead of a raw
// ZodError JSON dump.
export function describeValidationError(toolName, schema, args, error) {
    const action = typeof args.action === 'string' ? args.action : undefined;
    const actions = validActions(schema);
    if (actions && action !== undefined && !actions.includes(action)) {
        return `${toolName}: unknown action "${action}". Valid actions: ${actions.join(', ')}`;
    }
    if (actions && action === undefined) {
        // A wrong-typed action (a number, an object) is "unknown", not "missing".
        if ('action' in args) {
            return `${toolName}: unknown action ${JSON.stringify(args.action)}. Valid actions: ${actions.join(', ')}`;
        }
        return `${toolName}: missing required "action". Valid actions: ${actions.join(', ')}`;
    }
    const issues = error.issues
        .map((issue) => `${issue.path.join('.') || 'arguments'}: ${issue.message}`)
        .join('; ');
    let message = `Invalid arguments for ${toolName}`;
    if (action)
        message += ` action "${action}"`;
    message += `: ${issues}`;
    const reqs = action ? branchRequirements(schema, action) : null;
    if (reqs && (reqs.required.length > 0 || reqs.optional.length > 0)) {
        const parts = [];
        if (reqs.required.length > 0)
            parts.push(`requires ${reqs.required.join(', ')}`);
        if (reqs.optional.length > 0)
            parts.push(`accepts ${reqs.optional.join(', ')}`);
        message += `. Action "${action}" ${parts.join('; ')}`;
    }
    return message;
}
//# sourceMappingURL=schema.js.map
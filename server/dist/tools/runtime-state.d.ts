import { z } from 'zod';
import type { AnyToolDefinition } from '../core/types.js';
interface WatchRawSample {
    t_ms: number;
    value: number | string;
}
interface WatchRawEvent {
    t_ms: number;
    source: string;
    signal: string;
    args?: string;
}
export interface NumericFieldSummary {
    samples: number;
    start: number;
    end: number;
    min: number;
    max: number;
    min_at: number;
    max_at: number;
    mean: number;
    slope: number;
    events: Array<{
        t_ms: number;
        from: number;
        to: number;
        kind: 'sign_change' | 'zero_cross';
    }>;
    samples_truncated?: boolean;
}
export interface StringFieldSummary {
    samples: number;
    start: string;
    end: string;
    changes: Array<{
        t_ms: number;
        from: string;
        to: string;
    }>;
    samples_truncated?: boolean;
}
export declare function summarizeNumericField(samples: WatchRawSample[], windowMs: number): NumericFieldSummary;
export declare function summarizeStringField(samples: WatchRawSample[]): StringFieldSummary;
export type TimelineEntry = {
    t_ms: number;
    kind: 'signal';
    source: string;
    name: string;
    args?: string;
} | {
    t_ms: number;
    kind: 'anim_transition';
    source: string;
    from: string;
    to: string;
} | {
    t_ms: number;
    kind: 'field_change';
    source: string;
    field: string;
    from: string;
    to: string;
};
export declare const TIMELINE_MAX = 500;
export declare function buildTimeline(events: WatchRawEvent[], fields: Record<string, NumericFieldSummary | StringFieldSummary>): TimelineEntry[];
export declare const runtimeState: import("../core/types.js").ToolDefinition<z.ZodDiscriminatedUnion<[z.ZodObject<{
    action: z.ZodLiteral<"digest">;
    select: z.ZodOptional<z.ZodEnum<{
        auto: "auto";
        group: "group";
        method: "method";
        none: "none";
        visible: "visible";
    }>>;
    group: z.ZodOptional<z.ZodString>;
    paths: z.ZodOptional<z.ZodArray<z.ZodString>>;
    name: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodString>;
    max_nodes: z.ZodOptional<z.ZodNumber>;
    include: z.ZodOptional<z.ZodArray<z.ZodEnum<{
        anim: "anim";
        groups: "groups";
        onscreen: "onscreen";
        state: "state";
        transform: "transform";
        ui: "ui";
        velocity: "velocity";
    }>>>;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"watch_start">;
    specs: z.ZodOptional<z.ZodArray<z.ZodObject<{
        path: z.ZodString;
        fields: z.ZodArray<z.ZodString>;
    }, z.core.$strip>>>;
    signals: z.ZodOptional<z.ZodArray<z.ZodObject<{
        path: z.ZodString;
        signal: z.ZodString;
    }, z.core.$strip>>>;
    hz: z.ZodOptional<z.ZodNumber>;
    duration_ms: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"watch_collect">;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"watch_stop">;
}, z.core.$strip>], "action">>;
export declare const runtimeStateTools: AnyToolDefinition[];
export {};
//# sourceMappingURL=runtime-state.d.ts.map
import { z } from 'zod';
import type { AnyToolDefinition } from '../core/types.js';
export declare const JOY_BUTTON_NAMES: readonly ['a', 'b', 'x', 'y', 'back', 'guide', 'start', 'left_stick', 'right_stick', 'left_shoulder', 'right_shoulder', 'dpad_up', 'dpad_down', 'dpad_left', 'dpad_right', 'misc1', 'paddle1', 'paddle2', 'paddle3', 'paddle4', 'touchpad'];
export declare const JOY_AXIS_NAMES: readonly ['left_x', 'left_y', 'right_x', 'right_y', 'trigger_left', 'trigger_right'];
export declare const InputEntrySchema: z.ZodUnion<readonly [z.ZodObject<{
    start_ms: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    duration_ms: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    action_name: z.ZodString;
    strength: z.ZodOptional<z.ZodNumber>;
}, z.core.$strict>, z.ZodObject<{
    start_ms: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    duration_ms: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    joy_button: z.ZodUnion<readonly [z.ZodEnum<{
        a: "a";
        b: "b";
        back: "back";
        dpad_down: "dpad_down";
        dpad_left: "dpad_left";
        dpad_right: "dpad_right";
        dpad_up: "dpad_up";
        guide: "guide";
        left_shoulder: "left_shoulder";
        left_stick: "left_stick";
        misc1: "misc1";
        paddle1: "paddle1";
        paddle2: "paddle2";
        paddle3: "paddle3";
        paddle4: "paddle4";
        right_shoulder: "right_shoulder";
        right_stick: "right_stick";
        start: "start";
        touchpad: "touchpad";
        x: "x";
        y: "y";
    }>, z.ZodNumber]>;
    device: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strict>, z.ZodObject<{
    start_ms: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    duration_ms: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    axis: z.ZodEnum<{
        left_x: "left_x";
        left_y: "left_y";
        right_x: "right_x";
        right_y: "right_y";
        trigger_left: "trigger_left";
        trigger_right: "trigger_right";
    }>;
    value: z.ZodNumber;
    device: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strict>, z.ZodObject<{
    start_ms: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    duration_ms: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    stick: z.ZodEnum<{
        left: "left";
        right: "right";
    }>;
    x: z.ZodNumber;
    y: z.ZodNumber;
    device: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strict>, z.ZodObject<{
    start_ms: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    duration_ms: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    key: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
    physical: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strict>, z.ZodObject<{
    start_ms: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    duration_ms: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    look: z.ZodArray<z.ZodNumber>;
}, z.core.$strict>]>;
export type InputEntry = z.infer<typeof InputEntrySchema>;
export declare function compileInputEntries(inputs: InputEntry[]): Record<string, unknown>[];
export declare function entryLabel(e: InputEntry): string;
export declare function inputSkewWarning(inputs: InputEntry[], inputKinds: Record<string, number> | undefined): string | undefined;
export declare const input: import("../core/types.js").ToolDefinition<z.ZodDiscriminatedUnion<[z.ZodObject<{
    action: z.ZodLiteral<"get_map">;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"sequence">;
    inputs: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
        start_ms: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        duration_ms: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        action_name: z.ZodString;
        strength: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strict>, z.ZodObject<{
        start_ms: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        duration_ms: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        joy_button: z.ZodUnion<readonly [z.ZodEnum<{
            a: "a";
            b: "b";
            back: "back";
            dpad_down: "dpad_down";
            dpad_left: "dpad_left";
            dpad_right: "dpad_right";
            dpad_up: "dpad_up";
            guide: "guide";
            left_shoulder: "left_shoulder";
            left_stick: "left_stick";
            misc1: "misc1";
            paddle1: "paddle1";
            paddle2: "paddle2";
            paddle3: "paddle3";
            paddle4: "paddle4";
            right_shoulder: "right_shoulder";
            right_stick: "right_stick";
            start: "start";
            touchpad: "touchpad";
            x: "x";
            y: "y";
        }>, z.ZodNumber]>;
        device: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    }, z.core.$strict>, z.ZodObject<{
        start_ms: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        duration_ms: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        axis: z.ZodEnum<{
            left_x: "left_x";
            left_y: "left_y";
            right_x: "right_x";
            right_y: "right_y";
            trigger_left: "trigger_left";
            trigger_right: "trigger_right";
        }>;
        value: z.ZodNumber;
        device: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    }, z.core.$strict>, z.ZodObject<{
        start_ms: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        duration_ms: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        stick: z.ZodEnum<{
            left: "left";
            right: "right";
        }>;
        x: z.ZodNumber;
        y: z.ZodNumber;
        device: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    }, z.core.$strict>, z.ZodObject<{
        start_ms: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        duration_ms: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        key: z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>;
        physical: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strict>, z.ZodObject<{
        start_ms: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        duration_ms: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        look: z.ZodArray<z.ZodNumber>;
    }, z.core.$strict>]>>;
    report: z.ZodOptional<z.ZodArray<z.ZodString>>;
    screenshot_at_ms: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
    screenshot_max_width: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"type_text">;
    text: z.ZodString;
    delay_ms: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    submit: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>], "action">>;
export declare const inputTools: AnyToolDefinition[];
//# sourceMappingURL=input.d.ts.map
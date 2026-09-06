import { z } from 'zod';
import type { AnyToolDefinition } from '../core/types.js';
export declare const gameTime: import("../core/types.js").ToolDefinition<z.ZodDiscriminatedUnion<[z.ZodObject<{
    action: z.ZodLiteral<"freeze">;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"step">;
    duration_ms: z.ZodOptional<z.ZodNumber>;
    frames: z.ZodOptional<z.ZodNumber>;
    inputs: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
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
    }, z.core.$strict>]>>>;
    report: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"step_until">;
    until: z.ZodString;
    max_ms: z.ZodOptional<z.ZodNumber>;
    report: z.ZodOptional<z.ZodArray<z.ZodString>>;
    inputs: z.ZodOptional<z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
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
    }, z.core.$strict>]>>>;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"thaw">;
}, z.core.$strip>, z.ZodObject<{
    action: z.ZodLiteral<"status">;
}, z.core.$strip>], "action">>;
export declare const gameTimeTools: AnyToolDefinition[];
//# sourceMappingURL=game-time.d.ts.map
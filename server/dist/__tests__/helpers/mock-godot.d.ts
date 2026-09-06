import { vi } from 'vitest';
import type { GodotConnection } from '../../connection/websocket.js';
export interface CommandCall {
    command: string;
    params: Record<string, unknown>;
    opts?: {
        timeoutMs?: number;
    };
}
export interface MockGodotConnection {
    sendCommand: ReturnType<typeof vi.fn>;
    calls: CommandCall[];
    mockResponse: (response: unknown) => void;
    mockError: (error: Error) => void;
    godotVersion: string | null;
}
export declare function createMockGodot(): MockGodotConnection;
export declare function createToolContext(mock: MockGodotConnection): {
    godot: GodotConnection;
};
export declare function structuredOf(result: unknown): any;
//# sourceMappingURL=mock-godot.d.ts.map
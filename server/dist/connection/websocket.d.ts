import { EventEmitter } from 'events';
export type DisconnectReason = 'never_connected' | 'rejected_another_client' | 'replaced_by_new_client' | 'connection_refused' | 'connection_lost' | 'closed_normally' | 'unauthorized' | 'error';
export interface ConnectionDiagnostics {
    currentState: 'connected' | 'disconnected' | 'connecting' | 'reconnecting';
    lastDisconnectReason: DisconnectReason;
    rejectionCount: number;
    reconnectAttempts: number;
    lastErrorMessage: string | null;
    url: string;
    environment: 'wsl' | 'native';
}
export type HandshakeStatus = 'pending' | 'success' | 'failed' | 'timeout';
export interface HandshakeResult {
    addonVersion: string;
    godotVersion: string;
    projectPath: string;
    projectName: string;
    handshakeStatus: HandshakeStatus;
}
export interface GodotConnectionOptions {
    host?: string;
    port?: number;
    autoReconnect?: boolean;
    /**
     * Pairing token the addon's WebSocket server requires as the very first
     * message before dispatching anything else (see websocket_server.gd). An
     * addon running without the auth patch simply returns UNKNOWN_COMMAND for
     * "authenticate" and keeps the connection open, so sending this is safe
     * against both old and new addon versions. Undefined/empty still gets sent
     * (as an empty token) so a patched addon's rejection surfaces immediately
     * as a clear "unauthorized" diagnostic instead of every later command
     * timing out with no explanation.
     */
    authToken?: string;
}
export declare class GodotConnection extends EventEmitter {
    private ws;
    private pendingRequests;
    private reconnectAttempt;
    private reconnectTimeout;
    private pingInterval;
    private pongTimeout;
    private isClosing;
    private heartbeatPending;
    private handshakeResult;
    private lastDisconnectReason;
    private rejectionCount;
    private lastErrorMessage;
    private currentState;
    private readonly host;
    private readonly _port;
    private readonly autoReconnect;
    private readonly authToken;
    constructor(options?: GodotConnectionOptions);
    get isConnected(): boolean;
    get url(): string;
    get port(): number;
    get addonVersion(): string | null;
    get projectPath(): string | null;
    get projectName(): string | null;
    get godotVersion(): string | null;
    get serverVersion(): string;
    get versionsMatch(): boolean;
    getDiagnostics(): ConnectionDiagnostics;
    getDiagnosticMessage(): string;
    connect(): Promise<void>;
    disconnect(): void;
    sendCommand<T = unknown>(command: string, params?: Record<string, unknown>, opts?: {
        timeoutMs?: number;
    }): Promise<T>;
    private performAuthentication;
    private performHandshake;
    private handleMessage;
    private startPingInterval;
    private stopPingInterval;
    private clearPongTimeout;
    private scheduleReconnect;
    private cleanup;
}
export declare function getGodotConnection(): GodotConnection;
export declare function initializeConnection(): Promise<void>;
//# sourceMappingURL=websocket.d.ts.map
/**
 * Represents different network environments.
 */
export type GatewayEnvironment = 'wsl2' | 'wsl1' | 'linux' | 'windows' | 'macos';
export interface GatewayInfo {
    environment: GatewayEnvironment;
    gatewayIp: string | null;
    source?: string;
}
/**
 * Detects the current Linux environment (WSL1, WSL2, or native Linux) and resolves the gateway IP.
 * Gateway detection is only supported for Linux/WSL environments.
 * For other platforms, returns the environment type with null gateway.
 *
 * @returns Gateway information for the current environment
 */
export declare function resolveGateway(): GatewayInfo;
//# sourceMappingURL=gateway-resolver.d.ts.map
/**
 * Retrieves the Windows host IP when running in WSL.
 * In WSL, the Windows host can be reached via the gateway IP.
 *
 * Priority:
 * 1. GODOT_HOST env var (user-provided override)
 * 2. Auto-detect gateway IP from /etc/resolv.conf (WSL2 only)
 * 3. Returns null if not in WSL or detection fails
 *
 * Result is cached to avoid repeated resolution attempts.
 *
 * @returns The Windows host IP address, or null if not found
 */
export declare function getHostIpInWSL(): string | null;
/**
 * Clears the cached host IP. Used for testing purposes.
 */
export declare function _clearHostIpCache(): void;
//# sourceMappingURL=host-ip-resolver.d.ts.map
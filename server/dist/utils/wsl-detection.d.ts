/**
 * Detects if the current process is running in Windows Subsystem for Linux (WSL).
 * Uses a multi-signal detection approach for reliability:
 * 1. Environment variables (WSL_DISTRO_NAME, WSL_INTEROP) - fastest
 * 2. /proc/version file - most reliable on WSL2
 * 3. os.release() - fallback for other scenarios
 *
 * @returns true if running in WSL, false otherwise
 */
export declare function isWSL(): boolean;
//# sourceMappingURL=wsl-detection.d.ts.map
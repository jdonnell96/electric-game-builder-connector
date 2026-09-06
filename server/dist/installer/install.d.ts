export interface InstallResult {
    success: boolean;
    message: string;
    installedVersion?: string;
    previousVersion?: string;
    skipped?: boolean;
    /** `addons/godot_mcp` inside the project, whenever it exists after the call. */
    targetDir?: string;
    /** Manifest files present with the right contents after the call. */
    filesVerified?: number;
    /** Files missing from the package copy that were rebuilt from a `.DELETE.` leftover with matching contents. */
    recovered?: string[];
    /** Files missing from an existing install of the same version that were put back. */
    repaired?: string[];
    /** Files in an existing same-version install that differ from the package and were left alone (no --force). */
    modified?: string[];
}
export interface InstallOptions {
    force?: boolean;
    /** Override where the bundled addon is read from (tests). */
    bundledAddonDir?: string;
}
export declare function compareVersions(a: string, b: string): number;
export declare function defaultBundledAddonDir(): string;
export declare function installAddon(projectPath: string, options?: InstallOptions): Promise<InstallResult>;
/** The `_npx/<hash>` cache entry a package path sits in, if any. */
export declare function findNpxCacheEntry(path: string): string | undefined;
export declare function describeDamagedBundle(bundledAddon: string, damaged: string[]): string;
//# sourceMappingURL=install.d.ts.map
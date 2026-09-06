export interface BuildInfo {
    version: string;
    built_at: string;
    source_hash: string;
}
export interface BuildFreshness {
    mode: 'dist' | 'source' | 'packaged';
    built_at?: string;
    stale: boolean;
    changed?: string[];
    reason?: string;
}
export declare function hashSourceFiles(srcDir: string): Record<string, string>;
export declare function computeSourceHash(srcDir: string): string;
export declare function writeBuildInfoObject(version: string, srcDir: string, now?: Date): BuildInfo & {
    files: Record<string, string>;
};
export declare function checkBuildFreshness(here?: string): BuildFreshness;
//# sourceMappingURL=build-info.d.ts.map
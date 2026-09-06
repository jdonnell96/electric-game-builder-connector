export interface GodotCandidate {
    path: string;
    /** Where it came from, for the install report. */
    source: string;
}
export interface LocatorEnv {
    env?: NodeJS.ProcessEnv;
    platform?: NodeJS.Platform;
    home?: string;
}
export declare function findGodotCandidates(explicit?: string, opts?: LocatorEnv): GodotCandidate[];
/** Shallow scan for files named like a Godot 4 build, newest version first. */
export declare function scanForGodot(dir: string, platform: NodeJS.Platform, depth: number): string[];
//# sourceMappingURL=godot-locator.d.ts.map
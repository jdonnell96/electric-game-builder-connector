export declare const MANIFEST_FILE = "manifest.json";
export interface AddonManifest {
    version: string;
    generated_at: string;
    /** Path relative to the addon root, posix separators -> sha1 hex of the contents. */
    files: Record<string, string>;
}
export declare const DELETE_LEFTOVER_RE: RegExp;
export declare function isDeleteLeftover(name: string): boolean;
/** SHA-1 of the file with CRLF folded to LF, so a Windows checkout and a Linux-built package agree. */
export declare function hashFile(path: string): string;
/** CRLF -> LF for text; anything containing a NUL byte is left alone. */
export declare function normalizeLineEndings(data: Buffer): Buffer;
/** Rewrite every text file under `dir` with LF endings. Returns how many changed. */
export declare function normalizeTreeLineEndings(dir: string): number;
/** Every regular file under `dir`, as sorted posix-style paths relative to `dir`. */
export declare function walkFiles(dir: string): string[];
export declare function buildManifest(dir: string, version: string, now?: Date): AddonManifest;
export declare function readManifest(dir: string): AddonManifest | undefined;
export interface VerifyResult {
    ok: boolean;
    /** Manifest entries with no file on disk. */
    missing: string[];
    /** Manifest entries whose contents differ from the manifest hash. */
    mismatched: string[];
    /** Files on disk named like a node-tar delete leftover, wherever they sit. */
    leftovers: string[];
    /** Number of manifest entries present with the right contents. */
    verified: number;
}
/** Compare a directory against a manifest. Extra files are ignored; leftovers are reported. */
export declare function verifyAddonDir(dir: string, manifest: AddonManifest): VerifyResult;
//# sourceMappingURL=manifest.d.ts.map
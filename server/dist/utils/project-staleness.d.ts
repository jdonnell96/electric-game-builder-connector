export interface ProjectStaleness {
    stale: boolean;
    summary?: string;
    autoload?: {
        added: string[];
        removed: string[];
        changed: string[];
    };
    input?: {
        added: string[];
    };
    note?: string;
}
export declare function staleAdvisory(staleness?: ProjectStaleness): string | null;
//# sourceMappingURL=project-staleness.d.ts.map
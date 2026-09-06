import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
export interface MainDeps {
    createTransport?: () => Transport;
    connectGodot?: () => Promise<void>;
}
export declare function main(deps?: MainDeps): Promise<void>;
//# sourceMappingURL=index.d.ts.map
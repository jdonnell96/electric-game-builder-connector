/** Default socket timeout for any command that declares no in-game budget. Unchanged behavior. */
export declare const QUICK_TIMEOUT_MS = 30000;
/**
 * Hard backstop on the server socket regardless of declared budget — a
 * per-request timeout must never degrade into "wait forever" when the game
 * hangs. Chosen with Godot's 45s stale-connection timeout in mind: the 30s
 * application heartbeat refreshes that timer well inside this ceiling, so a
 * max-length command stays alive (see websocket_server.gd).
 */
export declare const ABSOLUTE_CEILING_MS = 60000;
/** Bridge-ready wait that precedes an input sequence; folded into the budget so caps are worst-case-safe. */
export declare const READY_WAIT_MS = 10000;
/** Wall-clock headroom the bridge allows over the in-game cap (a frame overrun, a capture render). */
export declare const BRIDGE_WALL_SLOP_MS = 5000;
/** The editor relay waits this much longer than the bridge's wall budget. */
export declare const RELAY_MARGIN_MS = 2000;
/** The server socket waits this much longer than the editor relay. */
export declare const SERVER_MARGIN_MS = 2000;
export interface DeriveOptions {
    /** Account for the bridge-ready wait (input sequences gate on it; game_time does not). */
    readyWait?: boolean;
}
export interface DerivedTimeouts {
    /** Wall budget the bridge enforces before aborting (partial, honestly reported). */
    bridgeWallMs: number;
    /** Total wall the editor relay waits (covers the ready-wait plus the bridge wall budget). */
    relayMs: number;
    /** Socket timeout the server applies to this command. <= ABSOLUTE_CEILING_MS by construction. */
    serverMs: number;
    /** The declared budget after clamping to what the ceiling permits. */
    clampedBudgetMs: number;
}
/**
 * The largest in-game budget a single call can declare and still answer before
 * the absolute ceiling, after subtracting the fixed cascade overhead (and the
 * ready-wait when applicable). Published tool caps must stay <= this.
 */
export declare function maxInGameBudgetMs(opts?: DeriveOptions): number;
/**
 * Derive the whole cascade from a tool's declared in-game budget. The budget is
 * clamped to what the ceiling permits BEFORE the ladder is built, so the
 * stagger (bridgeWall < relay < server <= ceiling) holds for any input.
 */
export declare function deriveTimeouts(inGameBudgetMs: number, opts?: DeriveOptions): DerivedTimeouts;
export declare const STEP_BUDGET_CAP_MS = 50000;
export declare const INPUT_BUDGET_CAP_MS = 40000;
export declare const EXEC_BUDGET_CAP_MS = 30000;
//# sourceMappingURL=timeouts.d.ts.map
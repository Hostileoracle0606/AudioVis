/**
 * Central cleanup manager.
 * Register handlers here; call runCleanup() once on exit.
 */
/** Register a cleanup callback. */
export declare function onCleanup(fn: () => void | Promise<void>): void;
/** Run all registered cleanup handlers exactly once. */
export declare function runCleanup(): Promise<void>;
/** Wire up process exit signals once. */
export declare function installCleanupHandlers(): void;
//# sourceMappingURL=cleanup.d.ts.map
"use strict";
/**
 * Central cleanup manager.
 * Register handlers here; call runCleanup() once on exit.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.onCleanup = onCleanup;
exports.runCleanup = runCleanup;
exports.installCleanupHandlers = installCleanupHandlers;
const handlers = [];
let ran = false;
/** Register a cleanup callback. */
function onCleanup(fn) {
    handlers.push(fn);
}
/** Run all registered cleanup handlers exactly once. */
async function runCleanup() {
    if (ran)
        return;
    ran = true;
    // Restore cursor and exit alternate screen first so the terminal is usable
    // even if a later cleanup step throws.
    process.stdout.write("\x1b[?25h"); // show cursor
    process.stdout.write("\x1b[?1049l"); // exit alternate screen
    for (const h of handlers) {
        try {
            await h();
        }
        catch {
            // swallow — we're exiting anyway
        }
    }
}
/** Wire up process exit signals once. */
function installCleanupHandlers() {
    const doExit = async (code = 0) => {
        await runCleanup();
        process.exit(code);
    };
    process.on("SIGINT", () => void doExit(0));
    process.on("SIGTERM", () => void doExit(0));
    process.on("uncaughtException", async (err) => {
        process.stderr.write(`\nUncaught exception: ${err.message}\n`);
        await runCleanup();
        process.exit(1);
    });
    process.on("unhandledRejection", async (reason) => {
        process.stderr.write(`\nUnhandled rejection: ${String(reason)}\n`);
        await runCleanup();
        process.exit(1);
    });
}
//# sourceMappingURL=cleanup.js.map
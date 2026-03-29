/**
 * Central cleanup manager.
 * Register handlers here; call runCleanup() once on exit.
 */

const handlers: Array<() => void | Promise<void>> = [];
let ran = false;

/** Register a cleanup callback. */
export function onCleanup(fn: () => void | Promise<void>): void {
  handlers.push(fn);
}

/** Run all registered cleanup handlers exactly once. */
export async function runCleanup(): Promise<void> {
  if (ran) return;
  ran = true;

  // Restore cursor and exit alternate screen first so the terminal is usable
  // even if a later cleanup step throws.
  process.stdout.write("\x1b[?25h"); // show cursor
  process.stdout.write("\x1b[?1049l"); // exit alternate screen

  for (const h of handlers) {
    try {
      await h();
    } catch {
      // swallow — we're exiting anyway
    }
  }
}

/** Wire up process exit signals once. */
export function installCleanupHandlers(): void {
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

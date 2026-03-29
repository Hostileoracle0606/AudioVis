import pc from "picocolors";

export function fatalError(message: string, err?: unknown): never {
  const detail =
    err instanceof Error ? err.message : err ? String(err) : "";
  console.error(pc.red(`\nError: ${message}`) + (detail ? `\n  ${detail}` : ""));
  process.exit(1);
}

export function warnError(message: string, err?: unknown): void {
  const detail =
    err instanceof Error ? err.message : err ? String(err) : "";
  console.error(pc.yellow(`Warning: ${message}`) + (detail ? ` (${detail})` : ""));
}

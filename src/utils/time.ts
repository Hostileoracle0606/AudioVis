export function msToSeconds(ms: number): number {
  return Math.floor(ms / 1000);
}

export function nowSeconds(): number {
  return Date.now() / 1000;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

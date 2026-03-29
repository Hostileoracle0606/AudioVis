/** Format seconds as MM:SS */
export function formatSeconds(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, "0")}`;
}

/**
 * Truncate a string to maxWidth, replacing the middle with "…" when needed.
 * Ensures the result never exceeds maxWidth characters.
 */
export function truncateMiddle(text: string, maxWidth: number): string {
  if (text.length <= maxWidth) return text;
  if (maxWidth <= 3) return text.slice(0, maxWidth);
  const half = Math.floor((maxWidth - 1) / 2);
  return text.slice(0, half) + "\u2026" + text.slice(text.length - (maxWidth - half - 1));
}

export function padRight(text: string, width: number, fill = " "): string {
  const needed = width - text.length;
  if (needed <= 0) return text.slice(0, width);
  return text + fill.repeat(needed);
}

export function padLeft(text: string, width: number, fill = " "): string {
  const needed = width - text.length;
  if (needed <= 0) return text.slice(0, width);
  return fill.repeat(needed) + text;
}

export function centerPad(text: string, width: number, fill = " "): string {
  const needed = width - text.length;
  if (needed <= 0) return text.slice(0, width);
  const left = Math.floor(needed / 2);
  const right = needed - left;
  return fill.repeat(left) + text + fill.repeat(right);
}

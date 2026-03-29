/**
 * Renders a centered ASCII progress bar.
 *
 * Example output (width=40):
 *   [##############--------------------------]  35%
 */
export function renderProgressBar(progress: number, width: number): string {
  const p = Math.max(0, Math.min(1, progress));

  // Reserve space for brackets and percentage label
  const LABEL_WIDTH = 5; // " 100%"
  const barWidth = Math.max(4, width - 2 - LABEL_WIDTH);

  const filled = Math.round(p * barWidth);
  const empty = barWidth - filled;

  const bar = "[" + "#".repeat(filled) + "-".repeat(empty) + "]";
  const pct = Math.round(p * 100)
    .toString()
    .padStart(3, " ") + "%";

  return bar + " " + pct;
}

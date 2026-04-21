import type { Renderer } from "../../ui/renderer.js";
import type { Region } from "../../ui/tui.js";
import type { AppState } from "../state.js";
import type { Theme } from "../theme.js";

const LABEL = "SPECTRUM ANALYZER // 16-BAND";
const NUM_BARS = 16;

export function renderSpectrum(
  r: Renderer,
  region: Region,
  state: AppState,
  theme: Theme,
): void {
  if (region.width < 20 || region.height < 5) return;
  const xi = region.x + 2;
  r.write(xi, region.y, `${theme.dim}[ ${LABEL} ]${theme.reset}`);

  const plotY = region.y + 2;
  const plotH = region.height - 3;
  const plotX = region.x + 2;
  const plotW = region.width - 4;

  const barW = Math.max(1, Math.floor(plotW / NUM_BARS));
  for (let b = 0; b < NUM_BARS; b++) {
    const mag = Math.max(0, Math.min(1, state.spectrum[b] ?? 0));
    const totalHalfRows = Math.round(mag * plotH * 2);
    const full = Math.floor(totalHalfRows / 2);
    const half = totalHalfRows % 2;
    const xStart = plotX + b * barW;
    const color = theme.spectrum[b];
    for (let i = 0; i < full; i++) {
      const y = plotY + plotH - 1 - i;
      r.write(xStart, y, `${color}${"\u2588".repeat(barW)}${theme.reset}`);
    }
    if (half > 0) {
      const y = plotY + plotH - 1 - full;
      r.write(xStart, y, `${color}${"\u2584".repeat(barW)}${theme.reset}`);
    }
  }
}

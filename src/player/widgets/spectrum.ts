import type { Renderer } from "../../ui/renderer.js";
import type { Region } from "../../ui/tui.js";
import type { AppState } from "../state.js";
import type { Theme } from "../theme.js";
import { createPeakHold, updatePeakHold, type PeakHoldBuffer } from "../peakHold.js";
import type { AccentTarget } from "../accentArbiter.js";

const NUM_BARS = 16;
const PALETTE_NAMES = ["amber", "teal", "magenta", "mono"];
const HZ_LABELS = ["62", "125", "250", "500", "1k", "2k", "4k", "8k"];

let holdBuf: PeakHoldBuffer | null = null;

export function renderSpectrum(
  r: Renderer,
  region: Region,
  state: AppState,
  theme: Theme,
  accent: Set<AccentTarget>,
): void {
  if (region.width < 20 || region.height < 6) return;
  const xi = region.x + 2;
  const paletteName = PALETTE_NAMES[state.spectrumPaletteIndex % PALETTE_NAMES.length];
  const peak = state.meterL > state.meterR ? state.meterL : state.meterR;
  const peakDb = peak > 0 ? (20 * Math.log10(peak)).toFixed(1) : "-inf";
  r.write(xi, region.y, `${theme.dim}[ spectrum \u00B7 16b \u00B7 ${paletteName} \u00B7 peak ${peakDb} dbtp ]${theme.reset}`);

  const plotY = region.y + 2;
  const plotH = region.height - 4;
  const plotX = region.x + 2;
  const plotW = region.width - 4;
  const barW = Math.max(1, Math.floor(plotW / NUM_BARS));

  if (!holdBuf) holdBuf = createPeakHold(NUM_BARS);
  updatePeakHold(holdBuf, state.spectrum, Date.now(), 1500);

  const labelRow = region.y + 1;
  let lx = plotX;
  for (const lbl of HZ_LABELS) {
    r.write(lx, labelRow, `${theme.dim}${lbl}${theme.reset}`);
    lx += barW * 2;
  }

  for (let b = 0; b < NUM_BARS; b++) {
    const mag = Math.max(0, Math.min(1, state.spectrum[b] ?? 0));
    const totalHalfRows = Math.round(mag * plotH * 2);
    const full = Math.floor(totalHalfRows / 2);
    const half = totalHalfRows % 2;
    const xStart = plotX + b * barW;
    const isBass = b === 0 && accent.has("bass-bin");
    const color = isBass ? theme.accent : theme.spectrum[b];
    for (let i = 0; i < full; i++) {
      const y = plotY + plotH - 1 - i;
      r.write(xStart, y, `${color}${"\u2588".repeat(barW)}${theme.reset}`);
    }
    if (half > 0) {
      const y = plotY + plotH - 1 - full;
      r.write(xStart, y, `${color}${"\u2584".repeat(barW)}${theme.reset}`);
    }

    const held = holdBuf.values[b];
    if (held > 0) {
      const heldRow = Math.round(held * plotH * 2) / 2;
      const y = plotY + plotH - 1 - Math.floor(heldRow);
      if (y >= plotY && y < plotY + plotH) {
        r.write(xStart, y, `${theme.accent}\u25CF${theme.reset}`);
      }
    }
  }

  const fy = region.y + region.height - 1;
  r.write(xi, fy, `${theme.dim}\u25CF peak-hold \u00B7 2s \u00B7 \u25E6 reset \u25E6 tilt \u25E6 a-weight${theme.reset}`);
}

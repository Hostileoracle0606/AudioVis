/**
 * Scrolling waveform visualizer mode.
 *
 * Maintains a ring buffer of amplitude values — one per visible column.
 * Each render frame the buffer shifts left by one and the latest amplitude
 * is appended at the right edge, producing a left-scrolling timeline.
 *
 * Each column is rendered as a symmetric vertical bar centred on the
 * middle row. Bar height scales with the stored amplitude; fill density
 * decreases from the centre toward the edges for visual depth.
 */

import type { VisState } from "../state.js";
import type { Renderer } from "../../ui/renderer.js";
import type { Theme } from "../../ui/theme.js";
import type { Region } from "../../ui/layout.js";

/**
 * Advance the scroll history buffer one step.
 * Shifts existing values left and appends the current amplitude at the
 * right edge. Call once per render frame before renderScroll.
 */
export function pushScrollHistory(state: VisState, width: number): void {
  // Resize if the terminal width changed
  if (state.scrollHistory.length !== width) {
    state.scrollHistory = new Float32Array(width);
    return;
  }
  state.scrollHistory.copyWithin(0, 1);
  state.scrollHistory[width - 1] = state.amplitude;
}

export function renderScroll(
  state: VisState,
  renderer: Renderer,
  region: Region,
  theme: Theme
): void {
  const W = region.width;
  const H = region.height;
  const cy = Math.floor(H / 2);
  const halfH = Math.max(1, cy - 1); // leave 1-row margin top and bottom

  const ascii = !theme.colorEnabled || theme.palette.length <= 5;

  for (let col = 0; col < W; col++) {
    const amp = state.scrollHistory[col] ?? 0;
    const barH = Math.round(amp * halfH);

    if (barH === 0) {
      // Centre tick so silence isn't completely blank
      const ch = ascii ? "-" : "\u2014";
      renderer.write(col, region.y + cy, ch);
      continue;
    }

    for (let dr = -barH; dr <= barH; dr++) {
      const row = cy + dr;
      if (row < 0 || row >= H) continue;

      const frac = Math.abs(dr) / barH; // 0 = centre, 1 = outer edge

      let ch: string;
      if (ascii) {
        ch = frac < 0.30 ? "#" : frac < 0.65 ? ":" : ".";
      } else {
        ch =
          frac < 0.25 ? "\u2588" :
          frac < 0.50 ? "\u2593" :
          frac < 0.75 ? "\u2592" : "\u2591";
      }

      let cell = ch;
      if (theme.colorEnabled) {
        if (frac < 0.25) cell = theme.bright + ch + theme.reset;
        else if (frac > 0.65) cell = theme.dim + ch + theme.reset;
        else cell = theme.normal + ch + theme.reset;
      }

      renderer.write(col, region.y + row, cell);
    }
  }
}

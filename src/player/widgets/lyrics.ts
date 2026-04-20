import type { Renderer } from "../../ui/renderer.js";
import type { Region } from "../../ui/tui.js";
import type { AppState } from "../state.js";
import type { Theme } from "../theme.js";
import { renderBigLine, GLYPH_H } from "../../ui/bitfont.js";

const LABEL_PLAIN = "[ KINETIC LYRICS // SYNC: RMS ]";
const LABEL_PEAK  = "[ TRANSIENT PEAK -> FONT-SCALE MAX ]";
const BIG_THRESHOLD = 0.6;

function clip(s: string, w: number): string {
  return s.length <= w ? s : s.slice(0, Math.max(0, w - 1)) + "…";
}

export function renderLyrics(
  r: Renderer,
  region: Region,
  state: AppState,
  theme: Theme,
): void {
  if (region.width < 20 || region.height < 6) return;
  const xi = region.x + 2;
  const big = state.transientEnergy >= BIG_THRESHOLD;
  r.write(xi, region.y, `${theme.dim}${big ? LABEL_PEAK : LABEL_PLAIN}${theme.reset}`);

  const active = state.lyrics[state.activeLyricIndex];
  const prev = state.lyrics[state.activeLyricIndex - 1];
  const next = state.lyrics[state.activeLyricIndex + 1];

  const bodyY = region.y + 2;
  const bodyW = region.width - 4;

  if (prev) r.write(xi, bodyY, `${theme.dim}${clip(prev.text, bodyW)}${theme.reset}`);
  if (next) r.write(xi, bodyY + Math.min(region.height - 4, 1 + (big ? GLYPH_H : 1)), `${theme.dim}${clip(next.text, bodyW)}${theme.reset}`);

  if (!active) return;
  if (big) {
    const rows = renderBigLine(active.text);
    for (let i = 0; i < Math.min(GLYPH_H, region.height - 5); i++) {
      r.write(xi, bodyY + 1 + i, `${theme.fg}${clip(rows[i], bodyW)}${theme.reset}`);
    }
  } else {
    r.write(xi, bodyY + 1, `${theme.fg}${clip(active.text, bodyW)}${theme.reset}`);
  }
}

import type { Renderer } from "../../ui/renderer.js";
import type { Region } from "../../ui/tui.js";
import type { AppState } from "../state.js";
import type { Theme } from "../theme.js";
import type { AccentTarget } from "../accentArbiter.js";
import { renderBigLyric } from "./bigLyric.js";

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, Math.max(0, max - 1)) + "\u2026";
}

export function renderLyrics(
  r: Renderer,
  region: Region,
  state: AppState,
  theme: Theme,
  accent: Set<AccentTarget>,
): void {
  if (region.width < 20 || region.height < 4) return;

  const xi = region.x + 2;
  const pad = region.width - 4;
  r.write(xi, region.y, `${theme.dim}[ lyrics \u00B7 sync rms ${state.rms.toFixed(2)} \u00B7 lrclib ]${theme.reset}`);

  if (state.lyrics.length === 0) {
    r.write(xi, region.y + 2, `${theme.dim}\u2014 no lyrics \u2014${theme.reset}`);
    return;
  }

  const idx = state.activeLyricIndex;
  const prev = idx > 0 ? state.lyrics[idx - 1]?.text : null;
  const active = idx >= 0 ? state.lyrics[idx]?.text : null;
  const next = idx + 1 < state.lyrics.length ? state.lyrics[idx + 1]?.text : null;

  if (prev) {
    r.write(xi, region.y + 1, `${theme.dim}\u00B7 ${truncate(prev, pad - 2)}${theme.reset}`);
  }

  if (active) {
    const bright = accent.has("sync") || accent.has("bass-bin");
    renderBigLyric(
      r,
      { x: region.x, y: region.y + 1, width: region.width, height: Math.min(region.height - 2, 5) },
      { text: active, bright },
      theme,
    );
  }

  if (next && region.height >= 8) {
    r.write(xi, region.y + region.height - 2, `${theme.dim}\u00B7 ${truncate(next, pad - 2)}${theme.reset}`);
  }
  const dotRow = region.y + region.height - 1;
  const dots = "\u00B7 ".repeat(Math.floor(pad / 2));
  r.write(xi, dotRow, `${theme.dim}${dots}${theme.reset}`);
}

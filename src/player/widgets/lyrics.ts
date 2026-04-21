import type { Renderer } from "../../ui/renderer.js";
import type { Region } from "../../ui/tui.js";
import type { AppState } from "../state.js";
import type { Theme } from "../theme.js";
import type { AccentTarget } from "../accentArbiter.js";
import { renderBigLyric } from "./bigLyric.js";
import { LYRIC_LEAD_MS } from "../feeders/lyricsFeeder.js";

const FALLBACK_LINE_MS = 4000; // used for the final lyric (no successor timestamp)

/**
 * Return the portion of the line that has been sung so far, assuming the
 * characters are uttered linearly across the line's time window. Used for
 * karaoke-style progressive reveal.
 */
export function sungSoFar(
  text: string,
  lineStartMs: number,
  nextLineStartMs: number | undefined,
  nowMs: number,
): string {
  if (text.length === 0) return "";
  const lineEndMs = nextLineStartMs ?? lineStartMs + FALLBACK_LINE_MS;
  const duration = Math.max(1, lineEndMs - lineStartMs);
  const progress = Math.max(0, Math.min(1, (nowMs - lineStartMs) / duration));
  const chars = Math.max(0, Math.min(text.length, Math.round(progress * text.length)));
  return text.slice(0, chars);
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
  const activeLine = idx >= 0 ? state.lyrics[idx] : null;

  if (activeLine && activeLine.text.length > 0) {
    // Same lead offset used to pick the active line — so the karaoke
    // char-reveal progresses in phase with the line switch instead of
    // lagging behind by ~250 ms.
    const effectiveNow = state.progressMs + LYRIC_LEAD_MS;
    const revealed = sungSoFar(activeLine.text, activeLine.timeMs, state.lyrics[idx + 1]?.timeMs, effectiveNow);
    if (revealed.length > 0) {
      const bright = accent.has("sync") || accent.has("bass-bin");
      const bigY = region.y + 1;
      const bigH = Math.max(0, region.height - 2);
      renderBigLyric(
        r,
        { x: region.x, y: bigY, width: region.width, height: bigH },
        { text: revealed, bright },
        theme,
      );
    }
  }

  const dotRow = region.y + region.height - 1;
  const dots = "\u00B7 ".repeat(Math.floor(pad / 2));
  r.write(xi, dotRow, `${theme.dim}${dots}${theme.reset}`);
}

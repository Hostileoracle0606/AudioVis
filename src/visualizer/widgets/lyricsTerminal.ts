/**
 * Lyrics Terminal widget — CRT-style synced lyrics panel.
 *
 * Behaviour:
 *   - Active lyric reveals character-by-character at ~60 ch/s
 *   - Blinking ▌ cursor sits at the reveal frontier on the active line
 *   - Lines above/below active line are shown dimmer as context
 *   - The active line is always kept in the upper-center of the panel
 *   - When lyrics are unavailable, shows a blinking prompt cursor
 */

import type { VisState } from "../state.js";
import type { Renderer } from "../../ui/renderer.js";
import type { Region } from "../../ui/layout.js";

const CHARS_PER_SEC = 60;   // typewriter reveal speed
const CURSOR_BLINK  = 600;  // ms per half-blink cycle
const CONTEXT_ABOVE = 3;    // dim lines to show above active
const CONTEXT_BELOW = 4;    // dim lines to show below active

function st(text: string, colour: string, reset: string): string {
  return colour ? colour + text + reset : text;
}

function drawBox(
  renderer: Renderer,
  r: Region,
  label: string,
  colour: string,
  reset: string
): void {
  const { x, y, width: W, height: H } = r;
  if (W < 4 || H < 2) return;
  const lbl   = label ? ` ${label} ` : "";
  const dash  = Math.max(0, W - 2 - lbl.length);
  const inner = "\u2500".repeat(Math.floor(dash / 2)) + lbl + "\u2500".repeat(dash - Math.floor(dash / 2));
  renderer.write(x, y,         st(`\u256D${inner}\u256E`, colour, reset));
  for (let r2 = 1; r2 < H - 1; r2++) {
    renderer.write(x,         y + r2, st("\u2502", colour, reset));
    renderer.write(x + W - 1, y + r2, st("\u2502", colour, reset));
  }
  renderer.write(x, y + H - 1, st(`\u2570${"\u2500".repeat(Math.max(0, W - 2))}\u256F`, colour, reset));
}

export function renderLyricsTerminal(
  state: VisState,
  renderer: Renderer,
  region: Region,
  now: number
): void {
  const song = state.songTheme;

  // CRT: use normal colour for the border (phosphor feel)
  drawBox(renderer, region, "terminal", song.normal, song.reset);

  const ix = region.x + 2;
  const iy = region.y + 1;
  const iW = region.width  - 4;
  const iH = region.height - 2;
  if (iW < 8 || iH < 2) return;

  // ── no lyrics ─────────────────────────────────────────────────────────────
  if (state.lrcLines.length === 0) {
    const cursorOn = Math.floor(now / CURSOR_BLINK) % 2 === 0;
    const cursor   = cursorOn ? "\u258C" : " ";   // ▌ or space

    const cy   = iy + Math.floor(iH / 2);
    let msg: string;
    switch (state.lyricFetchState) {
      case "fetching": msg = "loading lyrics\u2026" + cursor; break;
      case "none":     msg = "no lyrics found " + cursor;    break;
      default:         msg = "> " + cursor;
    }
    renderer.write(ix, cy, st(msg.slice(0, iW), song.dim, song.reset));
    return;
  }

  // ── active-line typewriter reveal ─────────────────────────────────────────
  const lines  = state.lrcLines;
  const active = state.activeLyricIdx;

  // Compute how many chars of the active line are revealed
  const ageMs    = Math.max(0, now - state.lyricRevealStartMs);
  const revealed = Math.min(
    lines[active]?.text.length ?? 0,
    Math.floor(ageMs * CHARS_PER_SEC / 1000)
  );
  // Write revealed count back so engine doesn't need to recompute
  state.lyricRevealedChars = revealed;

  const cursorOn = Math.floor(now / CURSOR_BLINK) % 2 === 0;
  const cursor   = cursorOn ? "\u258C" : " ";

  // ── scroll window ─────────────────────────────────────────────────────────
  // Keep active line at CONTEXT_ABOVE rows from the top of the panel.
  const firstLineIdx = Math.max(0, active - CONTEXT_ABOVE);
  const lastLineIdx  = Math.min(lines.length - 1, firstLineIdx + iH - 1);

  for (let i = firstLineIdx; i <= lastLineIdx; i++) {
    const rowY = iy + (i - firstLineIdx);
    if (rowY >= region.y + region.height - 1) break;

    const lyric = lines[i];
    if (!lyric) continue;

    const dist = i - active;           // negative = above, positive = below
    const isActive = dist === 0;

    let colour: string;
    if (isActive) {
      colour = song.bright || song.normal;
    } else if (Math.abs(dist) <= 1) {
      colour = song.normal;
    } else {
      colour = song.dim;
    }

    let lineText: string;
    if (isActive) {
      const shown = lyric.text.slice(0, revealed);
      lineText = "> " + shown + cursor;
    } else if (dist < 0) {
      // Past lines: fully shown
      lineText = "  " + lyric.text;
    } else {
      // Upcoming lines: dim
      lineText = "  " + lyric.text;
    }

    renderer.write(ix, rowY, st(lineText.slice(0, iW), colour, song.reset));
  }
}

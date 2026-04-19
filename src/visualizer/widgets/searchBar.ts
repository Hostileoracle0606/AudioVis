import type { VisState } from "../state.js";
import type { Renderer } from "../../ui/renderer.js";
import type { Region } from "../../ui/layout.js";

function s(text: string, colour: string, reset: string): string {
  return colour ? colour + text + reset : text;
}

/**
 * Slim single-row search/input bar across the full top of the screen.
 * Renders like hardware chrome: prompt, query text (or hint), right-edge hotkeys.
 */
export function renderSearchBar(state: VisState, renderer: Renderer, region: Region): void {
  const { x, y, width: W } = region;
  if (W < 10) return;

  const song  = state.songTheme;
  const color = state.searchFocused ? (song.bright || song.normal) : song.normal;

  // Left side: "▸ query_" or "▸ · · · ready"
  const query   = state.searchQuery || "\u00B7 \u00B7 \u00B7  type to search";
  const caret   = state.searchFocused ? "\u258C" : ""; // ▌
  const prompt  = "\u25B8 ";                           // ▸
  const leftStr = prompt + query + caret;

  // Right side: key hints
  const hints   = " [q]uit [n]ext [p]rev [spc]play ";
  const hintX   = Math.max(0, W - hints.length);

  // Write left (clipped to available space before hints)
  const leftMax = Math.max(0, hintX - 2);
  const leftClipped = leftStr.slice(0, leftMax);
  renderer.write(x, y, s(leftClipped, color, song.reset));

  // Write hints right-aligned
  if (hintX + hints.length <= x + W) {
    renderer.write(x + hintX, y, s(hints, song.dim, song.reset));
  }
}

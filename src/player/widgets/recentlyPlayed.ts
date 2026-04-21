import type { Renderer } from "../../ui/renderer.js";
import type { Region } from "../../ui/tui.js";
import type { AppState } from "../state.js";
import type { Theme } from "../theme.js";

export function renderRecentlyPlayed(
  r: Renderer,
  region: Region,
  state: AppState,
  theme: Theme,
): void {
  if (region.width < 10) return;
  const xi = region.x + 2;
  r.write(xi, region.y, `${theme.dim}[ RECENT ]${theme.reset}`);
  const maxRows = Math.min(8, region.height - 2);
  const itemW = region.width - 4;
  for (let i = 0; i < maxRows; i++) {
    const entry = state.recentlyPlayed[i];
    const num = String(i + 1).padStart(2, "0");
    const line = entry ? `${num}. ${entry.trackName}` : "";
    const truncated = line.length > itemW ? line.slice(0, itemW - 1) + "\u2026" : line;
    r.write(xi, region.y + 2 + i, `${theme.dim}${truncated}${theme.reset}`);
  }
}

import type { Renderer } from "../../ui/renderer.js";
import type { Region } from "../../ui/tui.js";
import type { AppState } from "../state.js";
import type { Theme } from "../theme.js";

const LABEL = "RECENTLY PLAYED";

export function renderRecentlyPlayed(
  r: Renderer,
  region: Region,
  state: AppState,
  theme: Theme,
): void {
  if (region.width < 10) return;
  const xi = region.x + 2;
  r.write(xi, region.y, `${theme.dim}${LABEL}${theme.reset}`);
  const maxRows = Math.min(8, region.height - 2);
  const itemW = region.width - 4;
  for (let i = 0; i < maxRows; i++) {
    const entry = state.recentlyPlayed[i];
    const line = entry ? `> ${entry.trackName}` : "";
    const truncated = line.length > itemW ? line.slice(0, itemW - 1) + "…" : line;
    r.write(xi, region.y + 2 + i, `${theme.fg}${truncated}${theme.reset}`);
  }
}

import type { Renderer } from "../../ui/renderer.js";
import type { AppState } from "../state.js";
import type { Theme } from "../theme.js";
import type { AppLayout } from "../layout.js";

function fmtMs(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const ss = (s % 60).toString().padStart(2, "0");
  const mm = m.toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

export function renderControls(
  r: Renderer,
  L: AppLayout,
  state: AppState,
  theme: Theme,
): void {
  const left = fmtMs(state.progressMs);
  const right = fmtMs(state.durationMs);
  const y = L.scrubR.y;
  const x0 = L.scrubR.x + 2;
  const xLast = L.scrubR.x + L.scrubR.width - 2;
  r.write(x0, y, `${theme.fg}${left}${theme.reset}`);
  r.write(xLast - right.length + 1, y, `${theme.fg}${right}${theme.reset}`);
  const trackX0 = x0 + left.length + 1;
  const trackX1 = xLast - right.length - 1;
  const trackW = Math.max(0, trackX1 - trackX0);
  const pct = state.durationMs > 0 ? Math.min(1, state.progressMs / state.durationMs) : 0;
  const knobAt = trackX0 + Math.round(pct * trackW);
  for (let x = trackX0; x <= trackX1; x++) {
    r.write(x, y, `${theme.dim}\u2500${theme.reset}`);
  }
  r.write(knobAt, y, `${theme.accent}\u25CB${theme.reset}`);

  const legend = "[p] Play   [n] Next   [b] Back   [m] Mute   [v] Vis Mode   [a] Art Toggle   [/] Search   [q] Quit";
  r.write(L.keysR.x + 2, L.keysR.y, `${theme.dim}${legend.slice(0, L.keysR.width - 4)}${theme.reset}`);
}

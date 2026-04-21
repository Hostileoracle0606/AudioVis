import type { Renderer } from "../../ui/renderer.js";
import type { AppState } from "../state.js";
import type { Theme } from "../theme.js";
import type { AppLayout } from "../layout.js";

const BRAILLE_HEIGHTS = [
  " ",
  "\u2840",
  "\u2844",
  "\u2846",
  "\u2847",
  "\u28C7",
  "\u28E7",
  "\u28F7",
  "\u28FF",
];

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
  const x0 = L.scrubR.x + 1;
  const xLast = L.scrubR.x + L.scrubR.width - 2;
  r.write(x0, y, `${theme.fg}${left}${theme.reset}`);
  r.write(xLast - right.length + 1, y, `${theme.fg}${right}${theme.reset}`);

  const waveX0 = x0 + left.length + 1;
  const waveX1 = xLast - right.length - 1;
  const waveW = Math.max(0, waveX1 - waveX0);
  const pct = state.durationMs > 0 ? Math.min(1, state.progressMs / state.durationMs) : 0;
  const playheadX = waveX0 + Math.round(pct * waveW);
  const envLen = state.progressEnvelope.length;

  for (let x = 0; x < waveW; x++) {
    const envIdx = Math.floor((x / waveW) * envLen);
    const v = Math.max(0, Math.min(1, state.progressEnvelope[envIdx] ?? 0));
    const absX = waveX0 + x;
    const past = absX <= playheadX;
    let glyph: string;
    if (absX === playheadX) {
      glyph = BRAILLE_HEIGHTS[8];
    } else if (past) {
      const idx = Math.round(v * 8);
      glyph = BRAILLE_HEIGHTS[Math.max(0, Math.min(8, idx))];
    } else {
      glyph = "\u00B7";
    }
    const color = absX === playheadX ? theme.accent : past ? theme.fg : theme.dim;
    r.write(absX, y, `${color}${glyph}${theme.reset}`);
  }

  const legend = "[p]lay [n]xt [b]ck [m]ute [v]is [a]rt [/]srch [1-8]pad [q]uit";
  const legendX = L.keysR.x + 1;
  r.write(legendX, L.keysR.y, `${theme.dim}${legend.slice(0, Math.min(legend.length, L.keysR.width - 22))}${theme.reset}`);

  const ledCount = 21;
  const ledX0 = L.keysR.x + L.keysR.width - ledCount * 2 - 1;
  for (let i = 0; i < ledCount; i++) {
    const x = ledX0 + i * 2;
    const lit = i === state.ledChaserIndex && state.isPlaying;
    const ch = lit ? `${theme.accent}\u25CF${theme.reset}` : `${theme.dim}\u00B7${theme.reset}`;
    r.write(x, L.keysR.y, ch);
  }
}

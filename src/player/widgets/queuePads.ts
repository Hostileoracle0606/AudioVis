import type { Renderer } from "../../ui/renderer.js";
import type { Region } from "../../ui/tui.js";
import type { AppState } from "../state.js";
import type { Theme } from "../theme.js";
import { computeDna } from "../trackDna.js";

const PAD_W = 8;
const PAD_H = 6;

function shortName(name: string): string {
  return name.slice(0, 3).toLowerCase().padEnd(3, "\u00B7");
}

export function renderQueuePads(
  r: Renderer,
  region: Region,
  state: AppState,
  theme: Theme,
): void {
  if (region.width < 8 || region.height < 4) return;

  const xi = region.x + 2;
  r.write(xi, region.y, `${theme.dim}[ pads \u00B7 queue 1/8 ]${theme.reset}`);

  const gridX = region.x + 1;
  const gridY = region.y + 2;
  for (let i = 0; i < 8; i++) {
    const row = Math.floor(i / 4);
    const col = i % 4;
    const x = gridX + col * PAD_W;
    const y = gridY + row * (PAD_H + 1);
    drawPad(r, x, y, i, state, theme);
  }

  const activeName = state.recentlyPlayed[0]?.trackName ?? "\u2014";
  const activeId = state.recentlyPlayed[0]
    ? `${state.recentlyPlayed[0].trackName}|${state.recentlyPlayed[0].artistName}`
    : "";
  const dna = activeId ? computeDna(activeId) : null;
  const bpm = dna ? `${dna.bpm}bpm` : "---bpm";
  const footer = `\u25B8 pad ${String(state.activePadIndex + 1).padStart(2,"0")} \u00B7 ${activeName.slice(0, 10)} \u00B7 ${bpm}`;
  r.write(xi, region.y + region.height - 2, `${theme.dim}${footer.slice(0, region.width - 4)}${theme.reset}`);
  r.write(xi, region.y + region.height - 1, `${theme.dim}${"\u00B7 ".repeat(Math.max(0, Math.floor((region.width - 4) / 2)))}${theme.reset}`);
}

function drawPad(
  r: Renderer,
  x: number,
  y: number,
  index: number,
  state: AppState,
  theme: Theme,
): void {
  const isActive = index === state.activePadIndex;
  const headerColor = isActive ? theme.accent : theme.dim;
  const track = state.recentlyPlayed[index];
  const name = track ? shortName(track.trackName) : "\u00B7\u00B7\u00B7";
  const numLabel = String(index + 1).padStart(2, "0");
  const fp = state.padFingerprints[index] ?? new Uint8Array(16);

  r.write(x, y,     `${headerColor}\u250C${numLabel}\u2500\u2500\u2510${theme.reset}`);
  for (let row = 0; row < 4; row++) {
    let cells = "";
    for (let col = 0; col < 4; col++) {
      cells += fp[row * 4 + col] ? "\u25CF" : "\u00B7";
    }
    r.write(x, y + 1 + row, `${theme.dim}\u2502${cells}\u2502${theme.reset}`);
  }
  r.write(x, y + 5, `${headerColor}\u2514${name}\u2500\u2500\u2518${theme.reset}`);
}

import type { Renderer } from "../../ui/renderer.js";
import type { Region } from "../../ui/tui.js";
import type { AppState } from "../state.js";
import type { Theme } from "../theme.js";
import { computeDna } from "../trackDna.js";
import { computePadFrame } from "../padSequencer.js";

const PAD_W = 8;
const PAD_H = 6;

/**
 * 2×4 beat-machine grid. Pads cycle in time with track BPM, each lighting up
 * a sparse pattern of LED bulbs. The active step is fully lit; all pads
 * briefly sparkle on audio transients.
 */
export function renderQueuePads(
  r: Renderer,
  region: Region,
  state: AppState,
  theme: Theme,
): void {
  if (region.width < 8 || region.height < 4) return;

  const xi = region.x + 2;
  const trackId = state.nowPlaying
    ? `${state.nowPlaying.trackName}|${state.nowPlaying.artistName}`
    : null;
  const dna = trackId ? computeDna(trackId) : null;
  const bpm = dna?.bpm ?? 120;

  const frame = computePadFrame(trackId, bpm, state.progressMs, state.lastTransientAt, Date.now());

  const stepStr = `${String(frame.activeStep + 1).padStart(2, "0")}/08`;
  const header = `[ pads \u00B7 step ${stepStr} \u00B7 ${frame.bpm}bpm ]`;
  r.write(xi, region.y, `${theme.dim}${header}${theme.reset}`);

  // Centre the 4-pad-wide grid horizontally in the region. Grid takes
  // 4 × PAD_W cols (last pad has no trailing gap), so leftover space
  // is split evenly between left and right margins.
  const gridContentW = 4 * PAD_W;
  const gridX = region.x + Math.max(1, Math.floor((region.width - gridContentW) / 2));
  const gridY = region.y + 2;
  for (let i = 0; i < 8; i++) {
    const row = Math.floor(i / 4);
    const col = i % 4;
    const x = gridX + col * PAD_W;
    const y = gridY + row * PAD_H;
    const isActive = i === frame.activeStep;
    const pattern = frame.patterns[i];
    drawPad(r, x, y, i, pattern, isActive, frame.flashing, theme);
  }

  const fy = region.y + region.height - 1;
  const dots = "\u00B7 ".repeat(Math.max(0, Math.floor((region.width - 4) / 2)));
  r.write(xi, fy, `${theme.dim}${dots}${theme.reset}`);
}

function drawPad(
  r: Renderer,
  x: number,
  y: number,
  index: number,
  pattern: Uint8Array,
  isActive: boolean,
  flashing: boolean,
  theme: Theme,
): void {
  const label = String(index + 1).padStart(2, "0");

  // Active pad: bright frame + bright bulbs on a warm-accent bed.
  // Inactive pad: dim frame, ON bulbs in normal accent, OFF bulbs dimmed.
  // Flash: every frame border briefly pulses to accent so the grid throbs
  // together on transients (sparkle bulbs are added by the sequencer).
  const frameColor = isActive ? theme.accentBright : flashing ? theme.accent : theme.dim;
  const bulbOn = isActive ? theme.accentBright : theme.accent;
  const bulbOff = isActive ? theme.accent : theme.dim;

  r.write(x, y,     `${frameColor}\u250C${label}\u2500\u2500\u2510${theme.reset}`);
  for (let row = 0; row < 4; row++) {
    r.write(x, y + 1 + row, `${frameColor}\u2502${theme.reset}`);
    for (let col = 0; col < 4; col++) {
      const on = pattern[row * 4 + col] === 1;
      const glyph = on ? "\u25CF" : "\u00B7";
      const color = on ? bulbOn : bulbOff;
      r.write(x + 1 + col, y + 1 + row, `${color}${glyph}${theme.reset}`);
    }
    r.write(x + 5, y + 1 + row, `${frameColor}\u2502${theme.reset}`);
  }
  r.write(x, y + 5, `${frameColor}\u2514\u2500\u2500\u2500\u2500\u2518${theme.reset}`);
}

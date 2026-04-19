/**
 * Wave Panel widget — layered flowing waveforms in the bottom-right panel.
 *
 * Uses cava bar data (state.cavaBars) when available, otherwise falls back
 * to the audio-DSP smoothedBuckets.  Renders three overlapping sinusoids
 * whose phases and amplitudes are modulated by live bar energy.
 */

import type { VisState } from "../state.js";
import type { Renderer } from "../../ui/renderer.js";
import type { Region } from "../../ui/layout.js";

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

/** Compute per-band average from a bar array spanning `lo..hi` fraction. */
function bandAvg(bars: Float32Array, lo: number, hi: number): number {
  const n  = bars.length;
  const s  = Math.floor(lo * n);
  const e  = Math.ceil(hi * n);
  if (e <= s) return 0;
  let sum = 0;
  for (let i = s; i < e; i++) sum += bars[i];
  return sum / (e - s);
}

export function renderWavePanel(
  state: VisState,
  renderer: Renderer,
  region: Region,
  now: number
): void {
  const song = state.songTheme;
  drawBox(renderer, region, "waves", song.dim, song.reset);

  const ix = region.x + 1;
  const iy = region.y + 1;
  const iW = region.width  - 2;
  const iH = region.height - 2;
  if (iW <= 0 || iH <= 0) return;

  // Source bars: cava if active, else DSP smoothed buckets
  const bars   = state.cavaActive && state.cavaBars.length > 0
    ? state.cavaBars
    : state.smoothedBuckets;

  // Extract three energy bands to modulate wave layers
  const bass   = bandAvg(bars, 0,    0.25);
  const mid    = bandAvg(bars, 0.25, 0.65);
  const treble = bandAvg(bars, 0.65, 1.0);

  const globalAmp = Math.max(0.05, state.amplitude);
  const phase     = state.sideWavePhase * Math.PI * 2;
  const midY      = iy + Math.floor(iH / 2);
  const halfH     = Math.max(1, Math.floor(iH / 2) - 1);

  // Three wave layers with different spatial frequencies and amp sources
  const waves = [
    { freq: 2,  amp: Math.max(0.1, bass),           phOff: 0,          ramp: song.densityRamp },
    { freq: 3.5,amp: Math.max(0.05, mid  * 0.7),   phOff: phase * 0.9, ramp: song.densityRamp },
    { freq: 6,  amp: Math.max(0.03, treble * 0.45), phOff: phase * 1.7, ramp: song.densityRamp },
  ];

  for (let c = 0; c < iW; c++) {
    const xNorm = c / Math.max(1, iW - 1);
    // Bar-mapped amplitude modulation: bin index within the bars array
    const binIdx = Math.floor(xNorm * (bars.length - 1));
    const barAmp = bars[binIdx] ?? globalAmp;

    for (const wave of waves) {
      const sin   = Math.sin(xNorm * Math.PI * wave.freq + wave.phOff);
      const mixed = sin * wave.amp * (0.5 + barAmp * 0.5);
      const row   = midY - Math.round(mixed * halfH);
      if (row < iy || row >= iy + iH) continue;

      // Colour tier by distance from midline
      const dist = Math.abs(mixed);
      let colour: string;
      if (dist > 0.55) colour = song.bright || song.normal;
      else if (dist > 0.25) colour = song.normal;
      else colour = song.dim;

      // Glyph from density ramp proportional to absolute amplitude
      const ramp = wave.ramp;
      const gIdx = Math.min(ramp.length - 2, Math.floor(dist * (ramp.length - 2)));
      const ch   = ramp[gIdx] || "~";

      renderer.write(ix + c, row, st(ch, colour, song.reset));
    }
  }

  // Beat flash — brief accent sweep on the beat
  const beatAge = now - state.lastPulseMs;
  if (beatAge < 120 && state.lastPulseStrength > 0.3) {
    const accent = song.accent || song.bright;
    for (let c = 0; c < iW; c += 2) {
      renderer.write(ix + c, midY, st("\u2015", accent, song.reset));
    }
  }
}

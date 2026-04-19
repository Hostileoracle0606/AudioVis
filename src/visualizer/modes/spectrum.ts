/**
 * Spectrum visualizer mode — classic vertical bar display, now with:
 *   - Density gradient within each bar (denser chars at the base).
 *   - Peak-hold caps with gravity decay.
 *   - Mirrored reflection under the baseline.
 *   - Per-song colour + glyph palette (see songTheme).
 *   - Tempo-sweep cursor tracing across the bar field once per beat,
 *     syncing the visualiser to the track's inferred BPM.
 *   - Kick flare: low-band pulses briefly expand the centre bars past
 *     their normal heights, creating a visible "thump" pulse.
 */

import type { VisState } from "../state.js";
import type { Renderer } from "../../ui/renderer.js";
import type { Theme } from "../../ui/theme.js";
import type { Region } from "../../ui/layout.js";

const BAR_WIDTH = 2;
const BAR_GAP = 1;
const PEAK_GRAVITY = 0.0016;
const PEAK_INSTANT_SNAP = 1.02;

export function renderSpectrum(
  state: VisState,
  renderer: Renderer,
  region: Region,
  theme: Theme
): void {
  const { numBars, smoothedBuckets } = state;
  const { x: rx, y: ry, width: RW, height: RH } = region;
  const song = state.songTheme;
  const feats = state.songFeatures;

  if (state.peakHold.length !== numBars) {
    state.peakHold = new Float32Array(numBars);
  }

  const totalBarsWidth = numBars * (BAR_WIDTH + BAR_GAP) - BAR_GAP;
  const startX = rx + Math.max(0, Math.floor((RW - totalBarsWidth) / 2));

  const useUnicode = !theme.palette.includes("@");

  const now = Date.now();
  const beatAge = (now - state.lastPulseMs) / 1000;
  const beatGlow = Math.max(0, 1 - beatAge / 0.35);
  // Kick flare only on hard beats (strength > 0.6) so regular snares don't trigger it.
  const kickActive = beatGlow > 0 && state.lastPulseStrength > 0.55;
  const kickFlare = kickActive ? beatGlow * state.lastPulseStrength : 0;

  // Reserve ~2/3 of the region for bars, ~1/3 for reflection.
  const baseRow = ry + Math.floor(RH * 0.66);
  const barRegionH = baseRow - ry;
  const reflectH = ry + RH - baseRow - 1;

  // Tempo sweep cursor — 0..1 across full bar width, synced to beat grid.
  const sweepX = feats.tempoPhase * totalBarsWidth;
  const sweepEnabled = feats.bpm > 0 && feats.confidence > 0.35;

  // Per-bar colour gradient from song palette: lowest bars lean to
  // normal/dim (bass as body), highest bars pop with accent (treble as sparkle).
  function barColor(bIdx: number, heightFrac: number, isTop: boolean): string {
    if (!theme.colorEnabled) return "";
    const freqFrac = bIdx / Math.max(1, numBars - 1); // 0=bass, 1=treble
    if (isTop)                               return song.accent;
    if (freqFrac > 0.75 && heightFrac < 0.3) return song.accent;
    if (freqFrac > 0.55)                      return song.bright;
    if (heightFrac < 0.4)                     return song.bright;
    if (heightFrac > 0.75)                    return song.dim;
    return song.normal;
  }

  for (let b = 0; b < numBars; b++) {
    let amp = smoothedBuckets[b] ?? 0;

    // ── Kick flare: pump the middle third of the spectrum on hard beats ─────
    // Uses a Gaussian-ish bell centred on the bass region (lower quarter).
    if (kickFlare > 0) {
      const bCentre = Math.floor(numBars * 0.2);
      const dist = Math.abs(b - bCentre) / Math.max(1, numBars * 0.25);
      const bell = Math.exp(-dist * dist * 2);
      amp = Math.min(1.15, amp + kickFlare * bell * 0.4);
    }

    // ── Peak-hold decay ─────────────────────────────────────────────────────
    const held = state.peakHold[b];
    if (amp * PEAK_INSTANT_SNAP >= held) {
      state.peakHold[b] = amp;
    } else {
      state.peakHold[b] = Math.max(0, held - PEAK_GRAVITY * (1 + held * 4));
    }

    const barHeightFrac = amp * barRegionH;
    const fullRows = Math.floor(barHeightFrac);
    const partial = barHeightFrac - fullRows;

    const barX = startX + b * (BAR_WIDTH + BAR_GAP);
    if (barX >= rx + RW) break;

    // Sweep highlight: is this bar currently under the tempo cursor?
    const barCentreX = (barX - startX) + BAR_WIDTH / 2;
    const sweepDist = Math.abs(barCentreX - sweepX);
    const underSweep = sweepEnabled && sweepDist < (BAR_WIDTH + BAR_GAP) * 1.5;
    const sweepBoost = underSweep ? Math.max(0, 1 - sweepDist / ((BAR_WIDTH + BAR_GAP) * 1.5)) : 0;

    // ── Main bar with density gradient + song palette ──────────────────────
    for (let r = 0; r < fullRows && r < barRegionH; r++) {
      const row = baseRow - 1 - r;
      const heightFrac = r / Math.max(1, fullRows - 1);

      // Use song-theme ramp to pick the density glyph — different songs get
      // visibly different bar textures (dots / blocks / stars / etc).
      let ch: string;
      if (useUnicode) {
        const ramp = song.densityRamp;
        // ramp is densest-first; index by height (so bases are dense).
        const idx = Math.min(ramp.length - 2, Math.floor(heightFrac * (ramp.length - 2)));
        ch = ramp[idx] || "\u2588";
      } else {
        ch = heightFrac < 0.55 ? "#" : heightFrac < 0.80 ? "%" : "+";
      }

      const isTop = r === fullRows - 1 && partial > 0;
      if (isTop && useUnicode) ch = "\u2584";

      let colour = barColor(b, heightFrac, isTop);
      // Sweep cursor promotes the colour one tier toward accent.
      if (sweepBoost > 0.3 && theme.colorEnabled) colour = song.accent;

      const cell = colour ? colour + ch + song.reset : ch;
      for (let bw = 0; bw < BAR_WIDTH; bw++) {
        const col = barX + bw;
        if (col >= rx + RW) break;
        renderer.write(col, row, cell);
      }
    }

    // Partial top row
    if (partial > 0.3 && fullRows < barRegionH) {
      const row = baseRow - 1 - fullRows;
      const ch = useUnicode ? "\u2581" : ".";
      const cell = theme.colorEnabled ? song.dim + ch + song.reset : ch;
      for (let bw = 0; bw < BAR_WIDTH; bw++) {
        const col = barX + bw;
        if (col >= rx + RW) break;
        renderer.write(col, row, cell);
      }
    }

    // ── Peak-hold cap (song-themed glyph) ──────────────────────────────────
    const capRowsUp = Math.floor(state.peakHold[b] * barRegionH);
    if (capRowsUp > fullRows && capRowsUp <= barRegionH) {
      const capRow = baseRow - 1 - capRowsUp;
      const capChar = useUnicode ? song.peakGlyph : "-";
      const cell = theme.colorEnabled
        ? song.accent + capChar + song.reset
        : capChar;
      for (let bw = 0; bw < BAR_WIDTH; bw++) {
        const col = barX + bw;
        if (col >= rx + RW) break;
        renderer.write(col, capRow, cell);
      }
    }

    // ── Mirrored reflection under the baseline ──────────────────────────────
    if (reflectH > 0) {
      const reflectFrac = amp * 0.5 + beatGlow * 0.15;
      const reflectRows = Math.min(reflectH, Math.floor(reflectFrac * reflectH * 2));
      for (let r = 0; r < reflectRows; r++) {
        const row = baseRow + 1 + r;
        if (row >= ry + RH) break;
        const depth = r / Math.max(1, reflectRows);
        let ch: string;
        if (useUnicode) {
          ch = depth < 0.4 ? "\u2592" : depth < 0.75 ? "\u2591" : "\u00B7";
        } else {
          ch = depth < 0.4 ? ":" : depth < 0.75 ? "." : "`";
        }
        const cell = theme.colorEnabled ? song.dim + ch + song.reset : ch;
        for (let bw = 0; bw < BAR_WIDTH; bw++) {
          const col = barX + bw;
          if (col >= rx + RW) break;
          renderer.write(col, row, cell);
        }
      }
    }
  }

  // ── Baseline ──────────────────────────────────────────────────────────────
  const lineChar = useUnicode ? "\u2500" : "-";
  const lineCell = theme.colorEnabled
    ? (beatGlow > 0.01 ? song.bright : song.dim) + lineChar + song.reset
    : lineChar;
  for (let col = startX; col < startX + totalBarsWidth && col < rx + RW; col++) {
    const relX = col - startX;
    const barIdx = Math.floor(relX / (BAR_WIDTH + BAR_GAP));
    const posInBar = relX - barIdx * (BAR_WIDTH + BAR_GAP);
    if (posInBar >= BAR_WIDTH) {
      renderer.write(col, baseRow, lineCell);
    }
  }

  // ── Tempo-sweep cursor overlay (a thin vertical pip above the baseline) ──
  if (sweepEnabled && theme.colorEnabled) {
    const cursorCol = startX + Math.round(sweepX);
    if (cursorCol >= rx && cursorCol < rx + RW) {
      const cursorChar = useUnicode ? "\u2502" : "|";
      const cell = song.accent + cursorChar + song.reset;
      // Draw at the baseline + 1 row above (subtle marker).
      renderer.write(cursorCol, baseRow, cell);
    }
  }

  // ── BPM / song-character readout (bottom-right of the spectrum region) ──
  // Tiny one-line status tucked into the reflection area so you know the
  // visualiser is picking up tempo / brightness / warmth.  Only shown if
  // we actually have confidence.
  if (feats.confidence > 0.3 && theme.colorEnabled) {
    const bpmStr = feats.bpm > 0 ? `${feats.bpm.toFixed(0)} bpm` : "";
    const infoRow = ry + RH - 1;
    const label = bpmStr ? `  ${bpmStr}  ` : "";
    if (label.length > 0) {
      const writeCol = rx + RW - label.length - 1;
      if (writeCol > rx + 2) {
        renderer.write(writeCol, infoRow, song.dim + label + song.reset);
      }
    }
  }
}

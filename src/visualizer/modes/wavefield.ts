/**
 * Wavefield visualizer mode.
 *
 * Rendering modes:
 *   ASCII  — three sinusoidal wave-lines with a distance-to-char ramp.
 *   Braille — full 2-D plasma field rendered at 2×4 dot subpixel resolution.
 *
 * Plasma field formula (four interfering sinusoids):
 *   P(x,y) = ¼·sin(x·fH + t·sH + beatPhase)   ← horizontal, bass-driven
 *           + ¼·sin(y·fV + t·sV)                ← vertical,   mid-driven
 *           + ¼·sin((x+y)·fD + t·sD)            ← diagonal,   treble-driven
 *           + ¼·sin(r·fR − t·sR)                ← radial rings, amp+pulse-driven
 *
 * Multi-band thresholding maps P → flowing "plasma" bands.  All spatial
 * frequencies and speeds are audio-reactive; a hard bass onset spikes the
 * radial speed (rings bloom outward) and widens the bands (screen flares).
 */

import type { VisState } from "../state.js";
import type { Renderer } from "../../ui/renderer.js";
import type { Theme } from "../../ui/theme.js";
import type { Region } from "../../ui/layout.js";

// ---------------------------------------------------------------------------
// ASCII path — three-wave distance-to-character ramp (unchanged)
// ---------------------------------------------------------------------------

const RAMP: Array<{ dist: number; char: string }> = [
  { dist: 0.5, char: "#" },
  { dist: 1.1, char: "x" },
  { dist: 1.8, char: ":" },
  { dist: 2.6, char: "." },
];

function distToChar(dist: number): string {
  for (const r of RAMP) {
    if (dist < r.dist) return r.char;
  }
  return " ";
}

// ---------------------------------------------------------------------------
// Braille path — 2D plasma field
// ---------------------------------------------------------------------------

// Unicode braille codepoints: U+2800 + bits
// Dot layout within one character cell (dc = dot-column, dr = dot-row):
//   dc=0  dc=1
//   dr=0   1    4     ← bit 0, bit 3
//   dr=1   2    5     ← bit 1, bit 4
//   dr=2   3    6     ← bit 2, bit 5
//   dr=3   7    8     ← bit 6, bit 7
const BRAILLE_BITS: readonly [readonly number[], readonly number[]] = [
  [0, 1, 2, 6], // dc=0
  [3, 4, 5, 7], // dc=1
];

function renderWavefieldBraille(
  W: number,
  H: number,
  elapsed: number,
  low: number,
  mid: number,
  high: number,
  amplitude: number,
  pulse: number,
  renderer: Renderer,
  region: Region,
  theme: Theme
): void {
  const TAU = 2 * Math.PI;
  const DOT_W = 2 * W;  // total dot columns
  const DOT_H = 4 * H;  // total dot rows

  // ── Spatial frequencies: how many bands fit across the screen ───────────
  // Bass → horizontal wave complexity; treble → diagonal fine detail.
  const fH = 3.0 + low       * 4.0;
  const fV = 2.0 + mid       * 3.0;
  const fD = 1.5 + high      * 5.0;
  const fR = 1.2 + amplitude * 2.5;   // radial rings; more rings when louder

  // ── Phase velocities (rad/s) ─────────────────────────────────────────────
  const sH = (0.8 + low       * 1.5) * TAU;
  const sV = (0.5 + mid       * 0.9) * TAU;
  const sD = (1.4 + high      * 2.5) * TAU;
  const sR = (1.8 + amplitude * 1.2 + pulse * 5.0) * TAU; // rings blast on beat

  // ── Beat flash: phase-kick the horizontal wave on each onset ─────────────
  // pulse is a sharp, unsmoothed onset value → creates a brief phase jump
  // that looks like a horizontal "tear" across the plasma — very hyperpop.
  const beatPhase = pulse * Math.PI;

  // ── Multi-band thresholding ───────────────────────────────────────────────
  // numBands: how many full interference bands span [0,1].
  // bandWidth: fraction [0,1] of each band period that's lit (dot density).
  // Both swell with audio energy, making the screen fill and throb.
  const numBands = 3.5 + low * 2.0 + mid * 1.0;
  const bandWidth = 0.50 + amplitude * 0.18 + pulse * 0.22;

  for (let termCol = 0; termCol < W; termCol++) {
    for (let termRow = 0; termRow < H; termRow++) {
      let bits = 0;
      let topV = 0.0; // highest field value among all lit dots in this cell

      for (let dc = 0; dc < 2; dc++) {
        for (let dr = 0; dr < 4; dr++) {
          // Normalised position: px, py ∈ [0, 1]; cx, cy ∈ [-0.5, 0.5]
          const px = (2 * termCol + dc) / DOT_W;
          const py = (4 * termRow + dr) / DOT_H;
          const cx = px - 0.5;
          const cy = py - 0.5;
          const r  = Math.sqrt(cx * cx + cy * cy); // 0 at centre, ~0.71 at corner

          // Four-component plasma sum.  Each term ∈ [-0.25, 0.25] → sum ∈ [-1, 1].
          const plasma =
            0.25 * Math.sin(px * fH * TAU + elapsed * sH + beatPhase) +
            0.25 * Math.sin(py * fV * TAU + elapsed * sV) +
            0.25 * Math.sin((px + py) * fD * Math.PI + elapsed * sD) +
            0.25 * Math.sin(r  * fR * TAU * 3.0 - elapsed * sR);

          const v = (plasma + 1) * 0.5; // remap to [0, 1]

          // Multi-band gate: lit if within the lit portion of the current band
          const bandPhase = (v * numBands) % 1.0;
          if (bandPhase < bandWidth) {
            bits |= 1 << BRAILLE_BITS[dc][dr];
            if (v > topV) topV = v;
          }
        }
      }

      if (bits === 0) continue;

      const ch = String.fromCodePoint(0x2800 + bits);
      let cell = ch;

      if (theme.colorEnabled) {
        // Three brightness tiers based on where in [0,1] the peak field value sits.
        // High v = plasma peak (constructive interference) → white-hot.
        // Low v = band edge → dim corona.
        if      (topV > 0.72) cell = theme.bright + ch + theme.reset;
        else if (topV > 0.54) cell = theme.normal + ch + theme.reset;
        else                  cell = theme.dim    + ch + theme.reset;
      }

      renderer.write(termCol, region.y + termRow, cell);
    }
  }
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export function renderWavefield(
  state: VisState,
  renderer: Renderer,
  region: Region,
  theme: Theme
): void {
  const W = region.width;
  const H = region.height;
  const elapsed = (Date.now() - state.startTime) / 1000;
  const cy = H / 2;

  // Use the plasma path whenever the terminal supports Unicode.
  // The ASCII path is unchanged for --ascii-safe terminals.
  const useBraille = theme.palette.length <= 5;

  if (useBraille) {
    renderWavefieldBraille(
      W, H, elapsed,
      state.low, state.mid, state.high,
      state.amplitude, state.pulse,
      renderer, region, theme
    );
    return;
  }

  // ── ASCII path ────────────────────────────────────────────────────────────
  const lowAmp  = 0.15 + state.low  * 0.30;
  const midAmp  = 0.07 + state.mid  * 0.18;
  const highAmp = 0.03 + state.high * 0.08;

  const speedLow  = 0.35 + state.low  * 0.15;
  const speedMid  = 0.70 + state.mid  * 0.25;
  const speedHigh = 1.40 + state.high * 0.40;

  const thick1 = 2.0 + state.low  * 1.5 + state.pulse * 0.8;
  const thick2 = 1.6 + state.mid  * 1.2;
  const thick3 = 1.2 + state.high * 0.8;

  for (let col = 0; col < W; col++) {
    const xNorm = col / W;
    const phaseShift = xNorm * 2 * Math.PI;

    const w1 = Math.sin(phaseShift * 2.0 + elapsed * speedLow) * (cy * lowAmp * 2);
    const w2 =
      Math.sin(phaseShift * 3.5 + elapsed * speedMid + 1.2) * (cy * midAmp * 2) +
      Math.sin(phaseShift * 1.3 + elapsed * speedMid * 0.6) * (cy * midAmp);
    const w3 = Math.sin(phaseShift * 7.0 + elapsed * speedHigh + 2.4) * (cy * highAmp * 2);

    const r1 = cy + w1;
    const r2 = cy * 0.55 + w2;
    const r3 = cy * 1.45 + w3;

    for (let rowOffset = 0; rowOffset < H; rowOffset++) {
      const absRow = region.y + rowOffset;
      const rowF   = rowOffset + 0.5;

      const d1 = Math.abs(rowF - r1);
      const d2 = Math.abs(rowF - r2);
      const d3 = Math.abs(rowF - r3);

      const minDist = Math.min(
        d1 < thick1 ? d1 : Infinity,
        d2 < thick2 ? d2 : Infinity,
        d3 < thick3 ? d3 : Infinity
      );

      if (minDist === Infinity) continue;

      const ch = distToChar(minDist);
      if (ch === " ") continue;

      const bright = theme.colorEnabled && minDist < 0.5;
      const dim    = theme.colorEnabled && minDist > 1.5;

      let cell = ch;
      if (bright) cell = theme.bright + ch + theme.reset;
      else if (dim) cell = theme.dim  + ch + theme.reset;
      else if (theme.colorEnabled) cell = theme.normal + ch + theme.reset;

      renderer.write(col, absRow, cell);
    }
  }
}

import type { VisState } from "../state.js";
import type { Renderer } from "../../ui/renderer.js";
import type { Theme } from "../../ui/theme.js";
import type { Region } from "../../ui/layout.js";
import { pitchAnsiColor } from "../pitchPalette.js";

const CONTOUR_RAMP = [" ", ".", "-", ":", "=", "+", "*", "#"] as const;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function sampleBuckets(values: Float32Array, position: number): number {
  if (values.length === 0) return 0;
  const scaled = clamp01(position) * Math.max(0, values.length - 1);
  const left = Math.floor(scaled);
  const right = Math.min(values.length - 1, left + 1);
  const mix = scaled - left;
  return (values[left] ?? 0) * (1 - mix) + (values[right] ?? 0) * mix;
}

function styleCell(ch: string, theme: Theme, state: VisState, intensity: number): string {
  if (!theme.colorEnabled) return ch;
  return pitchAnsiColor(state.pitchHue, state.pitchSaturation, intensity) + ch + theme.reset;
}

export function renderTopographic(
  state: VisState,
  renderer: Renderer,
  region: Region,
  theme: Theme
): void {
  const W = region.width;
  const H = region.height;
  if (W < 8 || H < 4) {
    return;
  }

  const TAU = Math.PI * 2;
  const now = (Date.now() - state.startTime) / 1000;
  const contourCount = 5 + Math.round(state.amplitude * 5 + state.high * 3);
  const threshold = 0.065 + state.high * 0.02;

  for (let x = 0; x < W; x++) {
    const nx = x / Math.max(1, W - 1);
    const bucket = sampleBuckets(state.smoothedBuckets, nx);
    const ridge =
      0.24 +
      bucket * (0.5 + state.low * 0.2) +
      0.12 * Math.sin(nx * TAU * (1.5 + state.mid * 1.8) + now * (0.55 + state.mid * 0.4)) +
      0.08 * Math.sin(nx * TAU * (3.2 + state.high * 2.1) - now * (0.8 + state.high * 0.6));

    for (let y = 0; y < H; y++) {
      const ny = y / Math.max(1, H - 1);
      const warp =
        0.05 * Math.sin(ny * TAU * (2.1 + state.high * 2.3) + now * (0.7 + state.high * 0.35)) +
        0.04 * Math.cos((nx + ny) * TAU * (1.6 + state.mid * 1.2) - now * (0.45 + state.low * 0.28));
      const field = ridge + warp - ny * (0.82 + state.amplitude * 0.28);
      if (field <= 0) continue;

      const contourPhase = (((field * contourCount) % 1) + 1) % 1;
      const distance = Math.abs(contourPhase - 0.5);
      if (distance > threshold) continue;

      const density = clamp01((1 - distance / threshold) * 0.7 + field * 0.45);
      const charIndex = Math.max(
        1,
        Math.min(CONTOUR_RAMP.length - 1, Math.floor(density * (CONTOUR_RAMP.length - 1)))
      );
      const ch = CONTOUR_RAMP[charIndex] ?? "#";
      const intensity = 0.18 + density * 0.74;
      renderer.writeCell(region.x + x, region.y + y, styleCell(ch, theme, state, intensity));
    }
  }
}

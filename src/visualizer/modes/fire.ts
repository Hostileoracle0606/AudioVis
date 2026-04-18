import type { VisState } from "../state.js";
import type { Renderer } from "../../ui/renderer.js";
import type { Theme } from "../../ui/theme.js";
import type { Region } from "../../ui/layout.js";
import { pitchAnsiColor } from "../pitchPalette.js";

const FIRE_RAMP = [" ", ".", ",", ":", ";", "x", "X", "%", "#", "@"] as const;

interface FireModeData {
  width: number;
  height: number;
  heat: Float32Array;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function hashNoise(a: number, b: number, c: number): number {
  let value = Math.imul(a + 19, 73856093) ^ Math.imul(b + 31, 19349663) ^ Math.imul(c + 47, 83492791);
  value = (value >>> 0) % 1000;
  return value / 1000;
}

function getFireModeData(state: VisState, width: number, height: number): FireModeData {
  const existing = state.modeData.fire as FireModeData | undefined;
  if (existing && existing.width === width && existing.height === height) {
    return existing;
  }

  const next: FireModeData = {
    width,
    height,
    heat: new Float32Array(width * height),
  };
  state.modeData.fire = next;
  return next;
}

function setHeat(data: FireModeData, x: number, y: number, value: number): void {
  if (x < 0 || x >= data.width || y < 0 || y >= data.height) return;
  data.heat[y * data.width + x] = clamp01(value);
}

function getHeat(data: FireModeData, x: number, y: number): number {
  if (x < 0 || x >= data.width || y < 0 || y >= data.height) return 0;
  return data.heat[y * data.width + x] ?? 0;
}

function styleCell(ch: string, theme: Theme, state: VisState, intensity: number): string {
  if (!theme.colorEnabled) return ch;
  return pitchAnsiColor(state.pitchHue, state.pitchSaturation, intensity) + ch + theme.reset;
}

export function prepareFire(state: VisState, region: Region): void {
  const data = getFireModeData(state, region.width, region.height);
  const next = new Float32Array(data.width * data.height);
  const now = Math.floor((Date.now() - state.startTime) / 80);

  for (let y = 0; y < data.height - 1; y++) {
    for (let x = 0; x < data.width; x++) {
      const below = getHeat(data, x, y + 1);
      const leftBelow = getHeat(data, x - 1, y + 1);
      const rightBelow = getHeat(data, x + 1, y + 1);
      const farBelow = getHeat(data, x, y + 2);
      const cooling = 0.04 + hashNoise(x, y, now) * (0.05 + state.high * 0.06);
      const value =
        below * 0.42 +
        leftBelow * 0.22 +
        rightBelow * 0.22 +
        farBelow * 0.14 -
        cooling;
      next[y * data.width + x] = clamp01(value);
    }
  }

  const lastRow = data.height - 1;
  for (let x = 0; x < data.width; x++) {
    const bucketIndex = Math.floor((x * state.smoothedBuckets.length) / Math.max(1, data.width));
    const bucket = state.smoothedBuckets[bucketIndex] ?? 0;
    const ember = hashNoise(x, lastRow, now);
    const base =
      state.amplitude * 0.3 +
      state.low * 0.34 +
      bucket * 0.42 +
      (ember > 0.52 ? state.pulse * 0.28 : 0);

    next[lastRow * data.width + x] = clamp01(base + ember * 0.14);
    if (data.height > 1) {
      next[(lastRow - 1) * data.width + x] = Math.max(
        next[(lastRow - 1) * data.width + x] ?? 0,
        clamp01(base * 0.58)
      );
    }
  }

  const sparkChance = 0.06 + state.high * 0.12 + state.pulse * 0.2;
  const sparkCount = Math.max(1, Math.round(data.width * sparkChance * 0.22));
  for (let i = 0; i < sparkCount; i++) {
    const x = Math.floor(hashNoise(i, now, data.width) * data.width);
    const y = Math.max(0, data.height - 2 - Math.floor(hashNoise(x, i, now) * Math.max(1, data.height / 3)));
    setHeat(
      { ...data, heat: next },
      x,
      y,
      Math.max(next[y * data.width + x] ?? 0, clamp01(0.68 + state.high * 0.24 + state.pulse * 0.2))
    );
  }

  data.heat = next;
}

export function renderFire(
  state: VisState,
  renderer: Renderer,
  region: Region,
  theme: Theme
): void {
  const data = getFireModeData(state, region.width, region.height);

  for (let y = 0; y < data.height; y++) {
    for (let x = 0; x < data.width; x++) {
      const value = getHeat(data, x, y);
      if (value < 0.035) continue;

      const idx = Math.max(0, Math.min(FIRE_RAMP.length - 1, Math.floor(value * (FIRE_RAMP.length - 1))));
      const ch = FIRE_RAMP[idx] ?? "@";
      const intensity = 0.2 + value * 0.8;
      renderer.writeCell(region.x + x, region.y + y, styleCell(ch, theme, state, intensity));
    }
  }
}

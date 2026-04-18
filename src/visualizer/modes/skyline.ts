import type { VisState } from "../state.js";
import type { Renderer } from "../../ui/renderer.js";
import type { Theme } from "../../ui/theme.js";
import type { Region } from "../../ui/layout.js";
import { pitchAnsiColor } from "../pitchPalette.js";

function averageRange(values: Float32Array, start: number, end: number): number {
  let sum = 0;
  let count = 0;
  for (let i = start; i < end && i < values.length; i++) {
    sum += values[i] ?? 0;
    count += 1;
  }
  return count === 0 ? 0 : sum / count;
}

function hashNoise(a: number, b: number, c: number): number {
  let value = Math.imul(a + 11, 73856093) ^ Math.imul(b + 17, 19349663) ^ Math.imul(c + 23, 83492791);
  value = (value >>> 0) % 1000;
  return value / 1000;
}

function styleCell(
  ch: string,
  theme: Theme,
  state: VisState,
  intensity: number
): string {
  if (!theme.colorEnabled) return ch;
  return pitchAnsiColor(state.pitchHue, state.pitchSaturation, intensity) + ch + theme.reset;
}

export function renderSkyline(
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

  const now = Date.now() - state.startTime;
  const groundY = region.y + H - 1;
  const buildingCount = Math.max(4, Math.min(state.smoothedBuckets.length, Math.floor(W / 3)));
  const blinkPhase = Math.floor(now / Math.max(90, 260 - Math.round(state.high * 120)));

  for (let x = region.x; x < region.x + W; x++) {
    const baseline = x % 9 === 0 && state.low > 0.5 ? "=" : "_";
    renderer.writeCell(x, groundY, styleCell(baseline, theme, state, 0.18));
  }

  for (let building = 0; building < buildingCount; building++) {
    const startX = region.x + Math.floor((building * W) / buildingCount);
    const endX = region.x + Math.floor(((building + 1) * W) / buildingCount) - 1;
    const width = Math.max(1, endX - startX + 1);
    if (width < 2) continue;

    const bucketStart = Math.floor((building * state.smoothedBuckets.length) / buildingCount);
    const bucketEnd = Math.max(
      bucketStart + 1,
      Math.floor(((building + 1) * state.smoothedBuckets.length) / buildingCount)
    );
    const bucketEnergy = averageRange(state.smoothedBuckets, bucketStart, bucketEnd);
    const lowBoost = state.low * (building % 3 === 0 ? 0.22 : 0.16);
    const midLift = state.mid * 0.1;
    const pulseBoost = state.pulse * (building % 4 === 0 ? 0.18 : 0.08);
    const heightFrac = Math.min(1, 0.14 + bucketEnergy * 0.55 + lowBoost + midLift + pulseBoost);
    const minHeight = Math.min(H - 1, Math.max(3, Math.floor(H * 0.28)));
    const height = Math.max(minHeight, Math.min(H - 1, Math.round(heightFrac * (H - 1))));
    const roofY = groundY - height + 1;

    for (let y = roofY; y < groundY; y++) {
      for (let x = startX; x <= endX; x++) {
        const isEdge = x === startX || x === endX;
        const isRoof = y === roofY;
        const floorIndex = groundY - y;
        const columnIndex = x - startX;

        let ch = isRoof ? "_" : isEdge ? "|" : "#";
        let intensity = isRoof ? 0.7 : 0.42 + bucketEnergy * 0.18;

        const canPlaceWindow = !isRoof && !isEdge && width >= 4;
        const windowSlot = (columnIndex + floorIndex) % 2 === 0 && floorIndex % 2 === 1;
        if (canPlaceWindow && windowSlot) {
          const flicker = hashNoise(building, x, floorIndex + blinkPhase);
          const lightChance = 0.08 + state.high * 0.38 + bucketEnergy * 0.16;
          if (flicker < lightChance) {
            ch = state.high > 0.5 || state.pulse > 0.55 ? ":" : ".";
            intensity = 0.92;
          } else {
            ch = "#";
            intensity = 0.3 + bucketEnergy * 0.16;
          }
        }

        renderer.writeCell(x, y, styleCell(ch, theme, state, intensity));
      }
    }

    const midX = Math.floor((startX + endX) / 2);
    const antennaHeight = width > 3 && height > Math.floor(H * 0.45) ? 1 + Math.round(state.low * 2) : 0;
    for (let k = 1; k <= antennaHeight; k++) {
      renderer.writeCell(midX, roofY - k, styleCell("|", theme, state, 0.55));
    }
    if (antennaHeight > 0 && (state.pulse > 0.35 || state.high > 0.55)) {
      const beacon = hashNoise(building, blinkPhase, antennaHeight) < 0.5 ? "*" : ".";
      renderer.writeCell(midX, roofY - antennaHeight - 1, styleCell(beacon, theme, state, 0.98));
    }
  }
}

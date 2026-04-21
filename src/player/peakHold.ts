export interface PeakHoldBuffer {
  values: Float64Array;
  heldUntilMs: Float64Array;
  lastUpdateMs: number;
}

/** Decay rate: 0.02 per 100ms = 0.0002 per ms → value reaches 0 from 1.0 in ~5s */
const DECAY_PER_MS = 0.0002;

export function createPeakHold(size: number): PeakHoldBuffer {
  return {
    values: new Float64Array(size),
    heldUntilMs: new Float64Array(size),
    lastUpdateMs: 0,
  };
}

export function updatePeakHold(
  buf: PeakHoldBuffer,
  current: Float32Array,
  now: number,
  holdMs: number,
): void {
  const dt = buf.lastUpdateMs === 0 ? 0 : Math.max(0, now - buf.lastUpdateMs);
  for (let i = 0; i < buf.values.length; i++) {
    const cur = current[i] ?? 0;
    if (cur >= buf.values[i]) {
      buf.values[i] = cur;
      buf.heldUntilMs[i] = now + holdMs;
    } else if (now > buf.heldUntilMs[i]) {
      buf.values[i] = Math.max(0, buf.values[i] - DECAY_PER_MS * dt);
    }
  }
  buf.lastUpdateMs = now;
}

/**
 * Attack/decay smoothing for visual bar heights and general signals.
 *
 * Attack controls how quickly the value rises toward the target.
 * Decay controls how quickly it falls.
 *
 * Values near 1.0 mean very slow response.
 * Values near 0.0 mean instant response.
 *
 * Recommended defaults:
 *   bars:   attack=0.8, decay=0.15
 *   energy: attack=0.7, decay=0.20
 */

export interface SmoothingConfig {
  attack: number;  // [0, 1)
  decay: number;   // [0, 1)
}

export const DEFAULT_BAR_SMOOTHING: SmoothingConfig = {
  attack: 0.80,
  decay: 0.15,
};

export const DEFAULT_ENERGY_SMOOTHING: SmoothingConfig = {
  attack: 0.70,
  decay: 0.20,
};

/**
 * Apply per-element attack/decay smoothing to a Float32Array.
 * Mutates `current` in place and returns it.
 */
export function smoothBuckets(
  current: Float32Array,
  target: Float32Array,
  cfg: SmoothingConfig = DEFAULT_BAR_SMOOTHING
): Float32Array {
  for (let i = 0; i < current.length; i++) {
    const t = target[i];
    const c = current[i];
    if (t > c) {
      current[i] = c + (t - c) * (1 - cfg.attack);
    } else {
      current[i] = c + (t - c) * (1 - cfg.decay);
    }
  }
  return current;
}

/**
 * Single-value exponential smoothing.
 */
export function smoothValue(
  current: number,
  target: number,
  cfg: SmoothingConfig = DEFAULT_ENERGY_SMOOTHING
): number {
  if (target > current) {
    return current + (target - current) * (1 - cfg.attack);
  }
  return current + (target - current) * (1 - cfg.decay);
}

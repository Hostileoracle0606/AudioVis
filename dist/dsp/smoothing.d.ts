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
    attack: number;
    decay: number;
}
export declare const DEFAULT_BAR_SMOOTHING: SmoothingConfig;
export declare const DEFAULT_ENERGY_SMOOTHING: SmoothingConfig;
/**
 * Apply per-element attack/decay smoothing to a Float32Array.
 * Mutates `current` in place and returns it.
 */
export declare function smoothBuckets(current: Float32Array, target: Float32Array, cfg?: SmoothingConfig): Float32Array;
/**
 * Single-value exponential smoothing.
 */
export declare function smoothValue(current: number, target: number, cfg?: SmoothingConfig): number;
//# sourceMappingURL=smoothing.d.ts.map
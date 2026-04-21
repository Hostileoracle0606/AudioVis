import type { Renderer } from "../../ui/renderer.js";
import type { Region } from "../../ui/tui.js";
import type { AppState } from "../state.js";
import type { Theme } from "../theme.js";
import type { AccentTarget } from "../accentArbiter.js";
/**
 * Distribute `plotW` cells across `n` slots such that every cell is used
 * exactly once. Returns {x, w} per slot; Σ w === plotW.
 */
export declare function distributeSlots(plotX: number, plotW: number, n: number): {
    x: number;
    w: number;
}[];
/**
 * Apply the reactive magnitude curve: clamp → gamma → tilt → optional flash.
 * Result is clamped to [0, 1].
 */
export declare function reactiveMag(raw: number, binIdx: number, totalBins: number, flash: boolean): number;
export declare function renderSpectrum(r: Renderer, region: Region, state: AppState, theme: Theme, accent: Set<AccentTarget>): void;
//# sourceMappingURL=spectrum.d.ts.map
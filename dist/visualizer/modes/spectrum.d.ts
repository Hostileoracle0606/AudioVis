/**
 * Spectrum visualizer mode — classic vertical bar display.
 *
 * Renders N evenly-spaced bars centered in the visualizer region.
 * Bar height is driven by smoothedBuckets from the DSP pipeline.
 * Uses block characters (or ASCII fallback) for sub-row resolution.
 */
import type { VisState } from "../state.js";
import type { Renderer } from "../../ui/renderer.js";
import type { Theme } from "../../ui/theme.js";
import type { Region } from "../../ui/layout.js";
export declare function renderSpectrum(state: VisState, renderer: Renderer, region: Region, theme: Theme): void;
//# sourceMappingURL=spectrum.d.ts.map
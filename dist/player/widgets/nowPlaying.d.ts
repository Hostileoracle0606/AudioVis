import type { Renderer } from "../../ui/renderer.js";
import type { Region } from "../../ui/tui.js";
import type { AppState } from "../state.js";
import type { Theme } from "../theme.js";
export declare function renderNowPlaying(r: Renderer, region: Region, state: AppState, theme: Theme): void;
/**
 * Advance the Lissajous buffer by a batch of points. Each point is a
 * 2D position `(X, Y)` inside the scope area where:
 *   - X = amp · sin(ωx · t + φx)
 *   - Y = amp · sin(ωy · t + φy)
 *
 * ωx and ωy are deliberately *different* frequencies (ratio driven by
 * the spectral centroid) so the curve visits the whole rectangle —
 * otherwise, with our 5:1 stretched strip aspect, a matched-frequency
 * trace collapses to the centre row. Amplitude tracks RMS (the most
 * reliable "signal present" indicator in the app state) with channel
 * meters biasing the ratio a little so a strong L/R imbalance tilts
 * the figure.
 */
export declare function stepScope(spectrum: Float32Array | number[], rms: number, meterL: number, meterR: number, pxCols: number, pxRows: number, nowMs: number): void;
//# sourceMappingURL=nowPlaying.d.ts.map
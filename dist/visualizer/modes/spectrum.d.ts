/**
 * Spectrum visualizer mode — classic vertical bar display, now with:
 *   - Density gradient within each bar (denser chars at the base).
 *   - Peak-hold caps with gravity decay.
 *   - Mirrored reflection under the baseline.
 *   - Per-song colour + glyph palette (see songTheme).
 *   - Tempo-sweep cursor tracing across the bar field once per beat,
 *     syncing the visualiser to the track's inferred BPM.
 *   - Kick flare: low-band pulses briefly expand the centre bars past
 *     their normal heights, creating a visible "thump" pulse.
 */
import type { VisState } from "../state.js";
import type { Renderer } from "../../ui/renderer.js";
import type { Theme } from "../../ui/theme.js";
import type { Region } from "../../ui/layout.js";
export declare function renderSpectrum(state: VisState, renderer: Renderer, region: Region, theme: Theme): void;
//# sourceMappingURL=spectrum.d.ts.map
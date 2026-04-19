/**
 * Scrolling waveform visualizer mode.
 *
 * Maintains a ring buffer of amplitude values — one per visible column —
 * that scrolls left each render frame.  On top of the waveform we run a
 * physics-driven particle system that spawns bursts on beat onsets and
 * emits a gentle shower on tempo-grid peaks, so even between beats the
 * display feels alive and the density of emission tells you about the
 * song's energy.
 */
import type { VisState } from "../state.js";
import type { Renderer } from "../../ui/renderer.js";
import type { Theme } from "../../ui/theme.js";
import type { Region } from "../../ui/layout.js";
export declare function pushScrollHistory(state: VisState, width: number): void;
export declare function renderScroll(state: VisState, renderer: Renderer, region: Region, theme: Theme): void;
//# sourceMappingURL=scroll.d.ts.map
/**
 * Scrolling waveform visualizer mode.
 *
 * Maintains a ring buffer of amplitude values — one per visible column.
 * Each render frame the buffer shifts left by one and the latest amplitude
 * is appended at the right edge, producing a left-scrolling timeline.
 *
 * Each column is rendered as a symmetric vertical bar centred on the
 * middle row. Bar height scales with the stored amplitude; fill density
 * decreases from the centre toward the edges for visual depth.
 */
import type { VisState } from "../state.js";
import type { Renderer } from "../../ui/renderer.js";
import type { Theme } from "../../ui/theme.js";
import type { Region } from "../../ui/layout.js";
/**
 * Advance the scroll history buffer one step.
 * Shifts existing values left and appends the current amplitude at the
 * right edge. Call once per render frame before renderScroll.
 */
export declare function pushScrollHistory(state: VisState, width: number): void;
export declare function renderScroll(state: VisState, renderer: Renderer, region: Region, theme: Theme): void;
//# sourceMappingURL=scroll.d.ts.map
import type { Renderer } from "../../ui/renderer.js";
import type { Region } from "../../ui/tui.js";
import type { AppState } from "../state.js";
import type { Theme } from "../theme.js";
import type { AccentTarget } from "../accentArbiter.js";
/**
 * Return the portion of the line that has been sung so far, assuming the
 * characters are uttered linearly across the line's time window. Used for
 * karaoke-style progressive reveal.
 */
export declare function sungSoFar(text: string, lineStartMs: number, nextLineStartMs: number | undefined, nowMs: number): string;
export declare function renderLyrics(r: Renderer, region: Region, state: AppState, theme: Theme, accent: Set<AccentTarget>): void;
//# sourceMappingURL=lyrics.d.ts.map
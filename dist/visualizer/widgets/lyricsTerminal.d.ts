/**
 * Lyrics Terminal widget — CRT-style synced lyrics panel.
 *
 * Behaviour:
 *   - Active lyric reveals character-by-character at ~60 ch/s
 *   - Blinking ▌ cursor sits at the reveal frontier on the active line
 *   - Lines above/below active line are shown dimmer as context
 *   - The active line is always kept in the upper-center of the panel
 *   - When lyrics are unavailable, shows a blinking prompt cursor
 */
import type { VisState } from "../state.js";
import type { Renderer } from "../../ui/renderer.js";
import type { Region } from "../../ui/layout.js";
export declare function renderLyricsTerminal(state: VisState, renderer: Renderer, region: Region, now: number): void;
//# sourceMappingURL=lyricsTerminal.d.ts.map
/**
 * Record-player deck widget — occupies the left 50 % of the main body.
 *
 * Internal vertical layout (top → bottom, within the outer border):
 *   now-playing strip  (2 rows)
 *   platter + tonearm  (~40 % of inner height)
 *   mid-divider row    (1 row: progress bar left, grille right)
 *   album-art screen   (remaining rows)
 */
import type { VisState } from "../state.js";
import type { Renderer } from "../../ui/renderer.js";
import type { Region } from "../../ui/layout.js";
export declare function renderRecordDeck(state: VisState, renderer: Renderer, region: Region, now: number): void;
//# sourceMappingURL=recordDeck.d.ts.map
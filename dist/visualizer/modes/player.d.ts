/**
 * Player mode — Teenage-Engineering-styled record player + side module.
 *
 * Composition (back → front):
 *   1. dim background plate (wavefield / scroll / spectrum at ~15%)
 *   2. record-player chassis (left pane)
 *   3. lyrics + waveform side module (right pane)
 *   4. centred floating search frame
 *
 * Design rules (see docs/player-mode-design.md):
 *   - lowercase labels, thin rounded frames, one accent per frame
 *   - chassis/turntable/controls = direct cell writes
 *   - screen sub-panel = album art via ansilize
 */
import type { VisState } from "../state.js";
import type { Renderer } from "../../ui/renderer.js";
import type { Theme } from "../../ui/theme.js";
import type { Region } from "../../ui/layout.js";
export declare function renderPlayer(state: VisState, renderer: Renderer, region: Region, theme: Theme): void;
//# sourceMappingURL=player.d.ts.map
import type { VisState } from "../state.js";
import type { Renderer } from "../../ui/renderer.js";
import type { Theme } from "../../ui/theme.js";
import type { Region } from "../../ui/layout.js";
/**
 * Render the album-art overlay mode.
 *
 * Layout (within the visualizer region):
 *   [plasma background at 0.15× amplitude]
 *   left 48%  : ASCII art, centered vertically
 *   col W/2-1 : vertical divider
 *   right 52% : now-playing panel (track, artist, album, progress, controls)
 */
export declare function renderAlbumArt(state: VisState, renderer: Renderer, region: Region, theme: Theme): void;
//# sourceMappingURL=albumArt.d.ts.map
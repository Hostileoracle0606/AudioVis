import type { Renderer } from "../../ui/renderer.js";
import type { Region } from "../../ui/tui.js";
import type { AppState } from "../state.js";
import type { Theme } from "../theme.js";
/**
 * Framed square screen containing the whole album-art image. The frame
 * fills the provided region top-to-bottom; the art interior is
 * `region.width - 2` × `region.height - 2` cells, which the feeder sizes
 * to render a visually square image (cols = 2 × rows, since each
 * half-block cell represents 2 vertical pixels).
 */
export declare function renderAlbumArt(r: Renderer, region: Region, state: AppState, theme: Theme): void;
//# sourceMappingURL=albumArt.d.ts.map
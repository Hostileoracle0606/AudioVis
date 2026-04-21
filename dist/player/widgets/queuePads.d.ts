import type { Renderer } from "../../ui/renderer.js";
import type { Region } from "../../ui/tui.js";
import type { AppState } from "../state.js";
import type { Theme } from "../theme.js";
/**
 * 2×4 beat-machine grid. Pads cycle in time with track BPM, each lighting up
 * a sparse pattern of LED bulbs. The active step is fully lit; all pads
 * briefly sparkle on audio transients.
 */
export declare function renderQueuePads(r: Renderer, region: Region, state: AppState, theme: Theme): void;
//# sourceMappingURL=queuePads.d.ts.map
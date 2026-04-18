import type { Region } from "../../ui/layout.js";
import type { Renderer } from "../../ui/renderer.js";
import type { Theme } from "../../ui/theme.js";
import { type VisMode, type VisState } from "../state.js";
export interface VisualizerModeDefinition {
    id: VisMode;
    label: string;
    prepare?: (state: VisState, region: Region) => void;
    render: (state: VisState, renderer: Renderer, region: Region, theme: Theme) => void;
}
export declare const VISUALIZER_MODE_ORDER: readonly ["wavefield", "scroll", "spectrum", "skyline", "fire", "tunnel"];
export declare function getVisualizerMode(mode: VisMode): VisualizerModeDefinition;
export declare function isVisualizerMode(value: string): value is VisMode;
//# sourceMappingURL=index.d.ts.map
import type { Region } from "../../ui/layout.js";
import type { Renderer } from "../../ui/renderer.js";
import type { Theme } from "../../ui/theme.js";
import { VIS_MODE_IDS, type VisMode, type VisState } from "../state.js";
import { renderScroll, prepareScroll } from "./scroll.js";
import { renderSkyline } from "./skyline.js";
import { renderSpectrum } from "./spectrum.js";
import { renderWavefield } from "./wavefield.js";

export interface VisualizerModeDefinition {
  id: VisMode;
  label: string;
  prepare?: (state: VisState, region: Region) => void;
  render: (state: VisState, renderer: Renderer, region: Region, theme: Theme) => void;
}

const MODE_DEFINITIONS: Record<VisMode, VisualizerModeDefinition> = {
  wavefield: {
    id: "wavefield",
    label: "Wavefield",
    render: renderWavefield,
  },
  scroll: {
    id: "scroll",
    label: "Scroll",
    prepare: (state, region) => prepareScroll(state, region.width),
    render: renderScroll,
  },
  spectrum: {
    id: "spectrum",
    label: "Spectrum",
    render: renderSpectrum,
  },
  skyline: {
    id: "skyline",
    label: "Skyline",
    render: renderSkyline,
  },
};

export const VISUALIZER_MODE_ORDER = VIS_MODE_IDS;

export function getVisualizerMode(mode: VisMode): VisualizerModeDefinition {
  return MODE_DEFINITIONS[mode];
}

export function isVisualizerMode(value: string): value is VisMode {
  return (VIS_MODE_IDS as readonly string[]).includes(value);
}

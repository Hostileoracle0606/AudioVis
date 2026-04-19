/**
 * Wave Panel widget — layered flowing waveforms in the bottom-right panel.
 *
 * Uses cava bar data (state.cavaBars) when available, otherwise falls back
 * to the audio-DSP smoothedBuckets.  Renders three overlapping sinusoids
 * whose phases and amplitudes are modulated by live bar energy.
 */
import type { VisState } from "../state.js";
import type { Renderer } from "../../ui/renderer.js";
import type { Region } from "../../ui/layout.js";
export declare function renderWavePanel(state: VisState, renderer: Renderer, region: Region, now: number): void;
//# sourceMappingURL=wavePanel.d.ts.map
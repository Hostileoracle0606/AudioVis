/**
 * Wavefield visualizer mode.
 *
 * Rendering modes:
 *   ASCII  — three sinusoidal wave-lines with a distance-to-char ramp.
 *   Braille — full 2-D plasma field rendered at 2×4 dot subpixel resolution.
 *
 * Plasma field formula (four interfering sinusoids):
 *   P(x,y) = ¼·sin(x·fH + t·sH + beatPhase)   ← horizontal, bass-driven
 *           + ¼·sin(y·fV + t·sV)                ← vertical,   mid-driven
 *           + ¼·sin((x+y)·fD + t·sD)            ← diagonal,   treble-driven
 *           + ¼·sin(r·fR − t·sR)                ← radial rings, amp+pulse-driven
 *
 * Multi-band thresholding maps P → flowing "plasma" bands.  All spatial
 * frequencies and speeds are audio-reactive; a hard bass onset spikes the
 * radial speed (rings bloom outward) and widens the bands (screen flares).
 */
import type { VisState } from "../state.js";
import type { Renderer } from "../../ui/renderer.js";
import type { Theme } from "../../ui/theme.js";
import type { Region } from "../../ui/layout.js";
export declare function renderWavefield(state: VisState, renderer: Renderer, region: Region, theme: Theme): void;
//# sourceMappingURL=wavefield.d.ts.map
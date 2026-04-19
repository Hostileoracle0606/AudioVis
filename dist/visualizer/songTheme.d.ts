/**
 * Per-song visual theme.
 *
 * Maps a trackId (for deterministic variation between songs) plus observed
 * long-running song features (for variation responsive to song character)
 * into a bundle of rendering knobs every mode can read.
 *
 * Design rule: *everything* in a SongTheme is a pure function of
 *   (trackId hash, songFeatures, baseTheme)
 * so it can be regenerated on-demand and stays stable as long as the track
 * stays put.
 */
import type { SongFeatures } from "../dsp/songFeatures.js";
export interface SongTheme {
    /** ANSI SGR strings.  Fall back to baseTheme when --no-color is set. */
    dim: string;
    normal: string;
    bright: string;
    accent: string;
    reset: string;
    /** Ramp used in wavefield ASCII / spectrum gradients — densest first. */
    densityRamp: string[];
    /** Single-glyph character for beat rings, sparkles, peak caps. */
    ringGlyph: string;
    sparkleGlyph: string;
    peakGlyph: string;
    /** Multipliers for mode-internal timing — let fast songs look fast. */
    phaseSpeedMul: number;
    waveLayerBias: number;
    spatialFreqMul: number;
    /** Small integer seed that modes can pass into their own PRNGs. */
    seed: number;
}
export declare function hashTrackId(trackId: string): number;
export interface BaseThemeFallback {
    dim: string;
    normal: string;
    bright: string;
    reset: string;
}
export declare function buildSongTheme(trackId: string, features: SongFeatures, fallback: BaseThemeFallback, colorEnabled: boolean): SongTheme;
/** Default theme used before a track is known — neutral and non-distracting. */
export declare function defaultSongTheme(fallback: BaseThemeFallback, colorEnabled: boolean): SongTheme;
//# sourceMappingURL=songTheme.d.ts.map
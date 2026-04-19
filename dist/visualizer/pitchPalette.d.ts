/**
 * Pitch-to-Palette: converts Spotify segment pitch data into ANSI 256 colours.
 * All functions are pure (no side effects, no project imports).
 */
/**
 * Compute a weighted-mean hue (0–360°) from a 12-element Spotify pitch array.
 * Uses circular mean so the 0°/360° boundary is handled correctly.
 * Returns null when all pitches are zero (caller should hold previous hue).
 *
 * @param pitches 12-element array of pitch confidences (Spotify format). Missing
 *                indices beyond the array length are treated as 0.
 *
 * Pitch → hue mapping (30° per semitone):
 *   C=0°  C#=30°  D=60°  D#=90°  E=120°  F=150°
 *   F#=180°  G=210°  G#=240°  A=270°  A#=300°  B=330°
 *
 * saturation = max(pitches) — high when one pitch dominates a clear key centre.
 */
export declare function computePitchHue(pitches: number[]): {
    hue: number;
    saturation: number;
} | null;
/**
 * Interpolate between two hues along the shorter arc of the colour wheel.
 * Interpolates along the shorter arc of the colour wheel. When the two hues
 * are exactly 180° apart the direction is arbitrary (inherent ambiguity in
 * circular interpolation) but in practice pitch vectors are rarely diametrically
 * opposite so this is not a visible concern.
 * Returns 0 if result is NaN.
 */
export declare function lerpCircularHue(current: number, target: number, t: number): number;
/**
 * Convert HSL (pitch-derived hue + saturation, amplitude-derived intensity)
 * to an xterm-256 palette index.
 *
 * @param hue        0–360 degrees
 * @param saturation 0–1 (clamped 0.2–1.0 so colours never go fully grey)
 * @param intensity  0–1 (mapped to lightness 0.15–0.85, avoiding pure black/white)
 */
export declare function hueToAnsi256(hue: number, saturation: number, intensity: number): number;
/**
 * Build an ANSI foreground colour escape string from current pitch state.
 * Convenience wrapper used by all three renderer files.
 *
 * @param pitchHue        Current animated hue (0–360°)
 * @param pitchSaturation Current saturation (0–1)
 * @param intensity       Per-cell brightness (0 = dim, 1 = bright)
 */
export declare function pitchAnsiColor(pitchHue: number, pitchSaturation: number, intensity: number): string;
//# sourceMappingURL=pitchPalette.d.ts.map
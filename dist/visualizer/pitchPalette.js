"use strict";
/**
 * Pitch-to-Palette: converts Spotify segment pitch data into ANSI 256 colours.
 * All functions are pure (no side effects, no project imports).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.computePitchHue = computePitchHue;
exports.lerpCircularHue = lerpCircularHue;
exports.hueToAnsi256 = hueToAnsi256;
exports.pitchAnsiColor = pitchAnsiColor;
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
function computePitchHue(pitches) {
    let sinSum = 0;
    let cosSum = 0;
    let total = 0;
    for (let i = 0; i < 12; i++) {
        const w = pitches[i] ?? 0;
        const theta = (i * 30 * Math.PI) / 180; // 0°, 30°, …, 330° in radians
        sinSum += Math.sin(theta) * w;
        cosSum += Math.cos(theta) * w;
        total += w;
    }
    if (total === 0)
        return null;
    const hueRad = Math.atan2(sinSum, cosSum);
    const hue = ((hueRad * 180) / Math.PI + 360) % 360;
    const saturation = Math.max(...pitches.slice(0, 12));
    return { hue, saturation };
}
/**
 * Interpolate between two hues along the shorter arc of the colour wheel.
 * Interpolates along the shorter arc of the colour wheel. When the two hues
 * are exactly 180° apart the direction is arbitrary (inherent ambiguity in
 * circular interpolation) but in practice pitch vectors are rarely diametrically
 * opposite so this is not a visible concern.
 * Returns 0 if result is NaN.
 */
function lerpCircularHue(current, target, t) {
    const delta = ((target - current + 540) % 360) - 180; // −180…+180
    const result = (current + delta * t + 360) % 360;
    return isNaN(result) ? 0 : result;
}
/**
 * Convert HSL (pitch-derived hue + saturation, amplitude-derived intensity)
 * to an xterm-256 palette index.
 *
 * @param hue        0–360 degrees
 * @param saturation 0–1 (clamped 0.2–1.0 so colours never go fully grey)
 * @param intensity  0–1 (mapped to lightness 0.15–0.85, avoiding pure black/white)
 */
function hueToAnsi256(hue, saturation, intensity) {
    const h = ((hue % 360) + 360) % 360;
    const s = Math.max(0.2, Math.min(1.0, saturation));
    const l = 0.15 + Math.max(0, Math.min(1, intensity)) * 0.70; // 0.15–0.85
    // HSL → RGB (standard algorithm)
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r1 = 0, g1 = 0, b1 = 0;
    if (h < 60) {
        r1 = c;
        g1 = x;
        b1 = 0;
    }
    else if (h < 120) {
        r1 = x;
        g1 = c;
        b1 = 0;
    }
    else if (h < 180) {
        r1 = 0;
        g1 = c;
        b1 = x;
    }
    else if (h < 240) {
        r1 = 0;
        g1 = x;
        b1 = c;
    }
    else if (h < 300) {
        r1 = x;
        g1 = 0;
        b1 = c;
    }
    else {
        r1 = c;
        g1 = 0;
        b1 = x;
    }
    const ri = Math.max(0, Math.min(5, Math.round((r1 + m) * 5)));
    const gi = Math.max(0, Math.min(5, Math.round((g1 + m) * 5)));
    const bi = Math.max(0, Math.min(5, Math.round((b1 + m) * 5)));
    return 16 + 36 * ri + 6 * gi + bi;
}
/**
 * Build an ANSI foreground colour escape string from current pitch state.
 * Convenience wrapper used by all three renderer files.
 *
 * @param pitchHue        Current animated hue (0–360°)
 * @param pitchSaturation Current saturation (0–1)
 * @param intensity       Per-cell brightness (0 = dim, 1 = bright)
 */
function pitchAnsiColor(pitchHue, pitchSaturation, intensity) {
    return `\x1b[38;5;${hueToAnsi256(pitchHue, pitchSaturation, intensity)}m`;
}
//# sourceMappingURL=pitchPalette.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.derivePitchFromBars = derivePitchFromBars;
exports.deriveMotionFrame = deriveMotionFrame;
exports.deriveSignalStyle = deriveSignalStyle;
const PITCH_LABELS = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
];
function clamp01(value) {
    return Math.max(0, Math.min(1, value));
}
function derivePitchFromBars(bars) {
    if (bars.length === 0)
        return null;
    let total = 0;
    let weighted = 0;
    let peak = 0;
    for (let i = 0; i < bars.length; i++) {
        const bar = bars[i] ?? 0;
        total += bar;
        weighted += bar * i;
        peak = Math.max(peak, bar);
    }
    if (total <= 1e-6)
        return null;
    const centroid = weighted / total;
    const hue = (centroid / Math.max(1, bars.length - 1)) * 330;
    return {
        hue,
        saturation: clamp01(peak),
    };
}
function deriveMotionFrame(nowMs, pulse, isPlaying) {
    const beatCycleMs = 900;
    const tatumCycleMs = 220;
    const sectionCycleMs = 6000;
    const beatProgress = isPlaying ? ((nowMs % beatCycleMs) / beatCycleMs) : 0;
    const tatumProgress = isPlaying ? ((nowMs % tatumCycleMs) / tatumCycleMs) : 0;
    const sectionProgress = isPlaying ? ((nowMs % sectionCycleMs) / sectionCycleMs) : 0;
    return {
        segment: null,
        tatumProgress,
        beatProgress,
        sectionProgress,
        sectionTransition: clamp01(pulse),
    };
}
function pickLabel(low, mid, high, pulse) {
    if (pulse > 0.7 && high > low)
        return "neon surge";
    if (low > 0.55 && pulse > 0.35)
        return "bass drive";
    if (high > 0.55)
        return "glass shimmer";
    if (mid > 0.45)
        return "center drift";
    return "steady glow";
}
function deriveSignalStyle(args) {
    const { low, mid, high, amplitude, pulse, hue, saturation } = args;
    const dominantPitchClass = Math.round((((hue % 360) + 360) % 360) / 30) % 12;
    const neon = clamp01(high * 0.55 + amplitude * 0.35 + pulse * 0.25);
    const organic = clamp01(mid * 0.35 + (1 - high) * 0.2 + (1 - pulse) * 0.25);
    const density = clamp01(amplitude * 0.6 + high * 0.2 + mid * 0.2);
    return {
        label: pickLabel(low, mid, high, pulse),
        confidence: clamp01(amplitude),
        glitch: clamp01(high * 0.55 + pulse * 0.45),
        neon,
        organic,
        metallic: clamp01(high * 0.5 + low * 0.1),
        softness: clamp01((1 - amplitude) * 0.35 + mid * 0.2 + (1 - pulse) * 0.35),
        aggression: clamp01(low * 0.5 + pulse * 0.45 + amplitude * 0.15),
        density,
        groove: clamp01(low * 0.35 + mid * 0.35 + (1 - pulse) * 0.1 + amplitude * 0.2),
        darkness: clamp01((1 - neon) * 0.4 + low * 0.2 + (1 - amplitude) * 0.2),
        dominantPitchClass,
        dominantPitchLabel: PITCH_LABELS[dominantPitchClass] ?? "C",
        hue,
        saturation: clamp01(0.25 + saturation * 0.75),
        brightness: clamp01(0.25 + amplitude * 0.55 + high * 0.1),
        genreHints: [],
    };
}
//# sourceMappingURL=signalStyle.js.map
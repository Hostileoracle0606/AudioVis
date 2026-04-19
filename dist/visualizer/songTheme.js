"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashTrackId = hashTrackId;
exports.buildSongTheme = buildSongTheme;
exports.defaultSongTheme = defaultSongTheme;
// ── Hash ───────────────────────────────────────────────────────────────────
// FNV-1a 32-bit.  Cheap, good enough for non-crypto seeding.
function hashTrackId(trackId) {
    let h = 0x811c9dc5;
    for (let i = 0; i < trackId.length; i++) {
        h ^= trackId.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    // Ensure non-negative 32-bit unsigned.
    return h >>> 0;
}
// ── Glyph palettes ─────────────────────────────────────────────────────────
// Eight families, picked by bit-slicing the hash.  Each family is internally
// consistent — ring/sparkle/peak characters are visually related so a given
// song reads as having a coherent motif.
const GLYPH_FAMILIES = [
    // 0: classic blocks
    { ramp: ["\u2588", "\u2593", "\u2592", "\u2591", "\u00B7", " "],
        ring: "o", sparkle: "\u00B7", peak: "\u2594" },
    // 1: dense dots — hyperpop-y, sparkly
    { ramp: ["\u25CF", "\u25C9", "\u25CE", "\u25CB", "\u00B7", " "],
        ring: "\u25CB", sparkle: "\u2219", peak: "\u25AA" },
    // 2: angular — sharp, synthwave
    { ramp: ["\u25B2", "\u25B3", "\u25AB", "\u00B7", ".", " "],
        ring: "\u25C7", sparkle: "*", peak: "\u25B4" },
    // 3: curves & waves
    { ramp: ["\u25D9", "\u25D8", "\u25D4", "\u00B7", ".", " "],
        ring: "\u25CC", sparkle: "\u2219", peak: "\u2322" },
    // 4: stars — gentle, dreamy
    { ramp: ["\u2738", "\u2737", "\u2736", "*", ".", " "],
        ring: "\u2737", sparkle: "*", peak: "\u2734" },
    // 5: bars & rails — industrial
    { ramp: ["\u2588", "\u2586", "\u2584", "\u2582", "\u2581", " "],
        ring: "=", sparkle: "\u2015", peak: "\u2594" },
    // 6: classic ascii — fallback-friendly
    { ramp: ["#", "%", "+", ":", ".", " "],
        ring: "o", sparkle: "*", peak: "-" },
    // 7: mixed — eclectic
    { ramp: ["\u2588", "\u25C9", "\u2593", "*", ".", " "],
        ring: "\u25CF", sparkle: "\u2737", peak: "\u203E" },
];
// ── Colour tables ──────────────────────────────────────────────────────────
// ANSI 256-colour codes chosen to form *muted*, not-eye-watering triads.
// Each row is [dim, normal, bright, accent].  Indices within a row are
// picked to sit on the same perceptual "ramp" so the three brightness
// tiers inside a mode stay coherent.
const HUE_TABLE = [
    { name: "neon-green", tier: [22, 34, 46, 118] },
    { name: "ice-cyan", tier: [24, 37, 51, 87] },
    { name: "violet", tier: [54, 93, 177, 207] },
    { name: "crimson", tier: [52, 160, 203, 214] },
    { name: "amber", tier: [94, 178, 220, 229] },
    { name: "magenta", tier: [53, 162, 206, 219] },
    { name: "deep-blue", tier: [17, 25, 39, 117] },
    { name: "sea-foam", tier: [23, 36, 49, 122] },
];
function sgr256(idx, style = "") {
    // style = "", "1;" (bright), "2;" (dim)  — applied before the 38;5;N foreground.
    return `\x1b[${style}38;5;${idx}m`;
}
function buildSongTheme(trackId, features, fallback, colorEnabled) {
    const h = trackId ? hashTrackId(trackId) : 0;
    // Glyph family — primarily driven by track hash, but biased by song
    // character: a very bright track prefers sparkly families, a warm track
    // prefers curves/stars, a loud-dynamic track prefers industrial bars.
    let familyIdx = h & 0x07;
    if (features.brightness > 0.6 && features.confidence > 0.3) {
        familyIdx = (familyIdx & 0x01) ? 1 : 4; // dots or stars
    }
    else if (features.warmth > 0.6 && features.confidence > 0.3) {
        familyIdx = (familyIdx & 0x01) ? 3 : 2; // curves or angular
    }
    else if (features.dynamics > 0.5 && features.density > 0.4) {
        familyIdx = 5; // industrial
    }
    const family = GLYPH_FAMILIES[familyIdx];
    // Hue — hash the middle bits of the hash so it's decorrelated from family.
    // Again biased by song character so the colour tells you something about
    // the song, not just a random reshuffle.
    let hueIdx = (h >>> 8) & 0x07;
    if (features.brightness > 0.55)
        hueIdx = [1, 2, 5, 7][(h >>> 16) & 3];
    else if (features.warmth > 0.55)
        hueIdx = [3, 4, 5][(h >>> 16) % 3];
    const hue = HUE_TABLE[hueIdx];
    // ANSI strings — fall back to monochrome when colour is disabled.
    const [cDim, cNormal, cBright, cAccent] = hue.tier;
    const reset = "\x1b[0m";
    const dim = colorEnabled ? sgr256(cDim) : fallback.dim;
    const normal = colorEnabled ? sgr256(cNormal) : fallback.normal;
    const bright = colorEnabled ? sgr256(cBright, "1;") : fallback.bright;
    const accent = colorEnabled ? sgr256(cAccent, "1;") : fallback.bright;
    // Timing / detail multipliers — higher bpm → slightly faster phases;
    // denser/loud songs → more spatial detail.
    const bpmRef = features.bpm > 0 ? features.bpm : 110;
    const phaseSpeedMul = 0.7 + Math.min(1.3, bpmRef / 120) * 0.6 + features.dynamics * 0.3;
    const spatialFreqMul = 0.8 + features.density * 0.6 + features.brightness * 0.4;
    const waveLayerBias = features.dynamics > 0.4 ? 2 : features.density > 0.3 ? 1 : 0;
    return {
        dim,
        normal,
        bright,
        accent,
        reset,
        densityRamp: family.ramp,
        ringGlyph: family.ring,
        sparkleGlyph: family.sparkle,
        peakGlyph: family.peak,
        phaseSpeedMul,
        waveLayerBias,
        spatialFreqMul,
        seed: h,
    };
}
/** Default theme used before a track is known — neutral and non-distracting. */
function defaultSongTheme(fallback, colorEnabled) {
    return buildSongTheme("", {
        bpm: 0,
        tempoPhase: 0,
        brightness: 0,
        warmth: 0,
        dynamics: 0,
        density: 0,
        confidence: 0,
    }, fallback, colorEnabled);
}
//# sourceMappingURL=songTheme.js.map
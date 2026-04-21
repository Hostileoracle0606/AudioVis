"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BLINK_DUTY = exports.BLINK_PERIOD_MS = exports.PALETTE_COUNT = void 0;
exports.blinkOn = blinkOn;
exports.blinkColor = blinkColor;
exports.buildTheme = buildTheme;
const SGR = (n) => `\x1b[${n}m`;
const FG256 = (n) => SGR(`38;5;${n}`);
const PALETTE_WARM = [208, 208, 214, 214, 220, 220, 226, 226, 220, 220, 214, 214, 208, 208, 202, 202];
const PALETTE_TEAL = [37, 37, 43, 43, 49, 49, 79, 79, 49, 49, 43, 43, 37, 37, 30, 30];
const PALETTE_MAGENTA = [161, 161, 162, 162, 165, 165, 171, 171, 165, 165, 162, 162, 161, 161, 125, 125];
const PALETTE_MONO = new Array(16).fill(250);
const PALETTES = [PALETTE_WARM, PALETTE_TEAL, PALETTE_MAGENTA, PALETTE_MONO];
const PALETTE_WARM_BRIGHT = 220; // bumped from 208
const PALETTE_TEAL_BRIGHT = 81;
const PALETTE_MAGENTA_BRIGHT = 201;
const PALETTE_MONO_BRIGHT = 255;
const BRIGHT_ACCENTS = [PALETTE_WARM_BRIGHT, PALETTE_TEAL_BRIGHT, PALETTE_MAGENTA_BRIGHT, PALETTE_MONO_BRIGHT];
exports.PALETTE_COUNT = PALETTES.length;
// Shared "on-air" blink cadence — a single place so every widget that
// shows a recording-indicator-style blink stays in sync and updates to
// the same period/duty cycle at once. Slow enough to feel like a studio
// tally light, not fast enough to read as "alarm".
exports.BLINK_PERIOD_MS = 1800;
exports.BLINK_DUTY = 0.60; // 60 % on-time
/** True when the blink is in its on-phase at `nowMs`. */
function blinkOn(nowMs) {
    return (nowMs % exports.BLINK_PERIOD_MS) < exports.BLINK_PERIOD_MS * exports.BLINK_DUTY;
}
/** Theme-aware on-air colour: bright accent when on, dim when off. */
function blinkColor(theme, nowMs) {
    return blinkOn(nowMs) ? theme.accentBright : theme.dim;
}
function buildTheme(paletteIndex, noColor) {
    if (noColor) {
        return {
            fg: "", dim: "", border: "", accent: "", accentBright: "", meter: "", reset: "",
            spectrum: new Array(16).fill(""),
        };
    }
    const palette = PALETTES[paletteIndex % PALETTES.length];
    return {
        fg: FG256(253),
        dim: FG256(244),
        border: FG256(240),
        accent: FG256(208),
        accentBright: FG256(BRIGHT_ACCENTS[paletteIndex % PALETTES.length]),
        meter: FG256(palette[8]),
        reset: SGR("0"),
        spectrum: palette.map((n) => FG256(n)),
    };
}
//# sourceMappingURL=theme.js.map
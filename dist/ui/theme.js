"use strict";
/**
 * Character palettes and minimal ANSI styling.
 *
 * By default the app renders in monochrome. An optional dim green tint
 * is applied when color is enabled (the classic terminal green aesthetic).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BAR_UPPER = exports.BAR_FULL = exports.UNICODE_PALETTE = exports.ASCII_PALETTE = void 0;
exports.buildTheme = buildTheme;
exports.densityChar = densityChar;
/** ASCII-safe character ramp from sparse to dense. */
exports.ASCII_PALETTE = [" ", ".", ":", ";", "x", "+", "=", "%", "#", "@"];
/** Unicode block character ramp from sparse to dense. */
exports.UNICODE_PALETTE = [" ", "\u2591", "\u2592", "\u2593", "\u2588"];
// Wave character used for spectrum bar blocks
exports.BAR_FULL = "\u2588";
exports.BAR_UPPER = "\u2584";
function buildTheme(ascii, color) {
    return {
        palette: ascii ? exports.ASCII_PALETTE : exports.UNICODE_PALETTE,
        colorEnabled: color,
        dim: color ? "\x1b[2;32m" : "\x1b[2m",
        normal: color ? "\x1b[0;32m" : "\x1b[0m",
        bright: color ? "\x1b[1;32m" : "\x1b[1m",
        reset: "\x1b[0m",
    };
}
/** Return the character in the palette for a normalised density in [0, 1]. */
function densityChar(density, theme) {
    const idx = Math.floor(density * (theme.palette.length - 1));
    return theme.palette[Math.max(0, Math.min(theme.palette.length - 1, idx))];
}
//# sourceMappingURL=theme.js.map
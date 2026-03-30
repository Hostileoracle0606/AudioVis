"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertToAscii = convertToAscii;
// src/album/converter.ts
const jimp_1 = __importDefault(require("jimp"));
const PALETTE = " .,:;+*#%@█";
/** Map luminance [0,1] to an ASCII character. */
function lumToChar(lum) {
    const idx = Math.min(PALETTE.length - 1, Math.floor(lum * PALETTE.length));
    return PALETTE[idx];
}
/**
 * Find the nearest xterm-256 color index for an RGB value.
 * Uses the 216-color cube (indices 16–231) for color fidelity.
 */
function rgbToAnsi256(r, g, b) {
    const ri = Math.round((r / 255) * 5);
    const gi = Math.round((g / 255) * 5);
    const bi = Math.round((b / 255) * 5);
    return 16 + 36 * ri + 6 * gi + bi;
}
/** Wrap a character with ANSI 256 foreground color. */
function colorChar(ch, r, g, b) {
    const code = rgbToAnsi256(r, g, b);
    return `\x1b[38;5;${code}m${ch}\x1b[0m`;
}
/**
 * Convert a raw image buffer to an AsciiArt object.
 *
 * @param buffer   Raw JPEG/PNG bytes
 * @param trackId  Spotify track ID (stored for cache keying)
 * @param vizCols  Width of the visualizer region in terminal columns
 * @param vizRows  Height of the visualizer region in terminal rows
 * @param noColor  If true, emit plain ASCII without ANSI color codes
 */
async function convertToAscii(buffer, trackId, vizCols, vizRows, noColor) {
    // Left panel is 48% of visualizer width
    const artCols = Math.floor(vizCols * 0.48);
    // Correct for terminal character aspect ratio (~2:1 height:width)
    const artRows = Math.floor(artCols / 2.2);
    const targetRows = Math.min(artRows, vizRows - 2); // leave 1 row margin top+bottom
    const targetCols = Math.floor(targetRows * 2.2);
    if (targetRows <= 0 || targetCols <= 0) {
        return { trackId, thumbnail: [], lines: [], cols: vizCols, rows: vizRows };
    }
    const img = await jimp_1.default.read(buffer);
    // ── Full-size art ──────────────────────────────────────────────────────────
    const full = img.clone().resize(targetCols, targetRows);
    const lines = [];
    const actualCols = full.bitmap.width;
    const actualRows = full.bitmap.height;
    for (let row = 0; row < actualRows; row++) {
        let line = "";
        for (let col = 0; col < actualCols; col++) {
            const pixel = full.getPixelColor(col, row);
            const r = (pixel >>> 24) & 0xff;
            const g = (pixel >>> 16) & 0xff;
            const b = (pixel >>> 8) & 0xff;
            const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            const ch = lumToChar(lum);
            line += noColor ? ch : colorChar(ch, r, g, b);
        }
        lines.push(line);
    }
    // ── 4×2 thumbnail ─────────────────────────────────────────────────────────
    const thumb = img.clone().resize(4, 2);
    const thumbnail = [];
    const thumbCols = thumb.bitmap.width;
    const thumbRows = thumb.bitmap.height;
    for (let row = 0; row < thumbRows; row++) {
        let line = "";
        for (let col = 0; col < thumbCols; col++) {
            const pixel = thumb.getPixelColor(col, row);
            const r = (pixel >>> 24) & 0xff;
            const g = (pixel >>> 16) & 0xff;
            const b = (pixel >>> 8) & 0xff;
            const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            const ch = lumToChar(lum);
            line += noColor ? ch : colorChar(ch, r, g, b);
        }
        thumbnail.push(line);
    }
    return {
        trackId,
        thumbnail,
        lines,
        cols: vizCols,
        rows: vizRows,
    };
}
//# sourceMappingURL=converter.js.map
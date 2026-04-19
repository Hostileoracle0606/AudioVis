"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ansilize = ansilize;
exports.ansilizeMono = ansilizeMono;
const HALF_BLOCK = "\u2580"; // ▀
/**
 * Render a Jimp image to an array of ANSI-escape-laden strings, one per row.
 *
 * @param img     Jimp image (already decoded).  Not mutated.
 * @param cols    Target width in terminal cells.
 * @param rows    Target height in terminal cells (each cell = 2 image pixels).
 */
function ansilize(img, cols, rows) {
    if (cols <= 0 || rows <= 0)
        return [];
    // Resize to cols × (rows * 2) pixels — 2 vertical pixels per cell.
    const resized = img.clone().resize(cols, rows * 2);
    const W = resized.bitmap.width;
    const H = resized.bitmap.height;
    const lines = [];
    let prevFg = -1;
    let prevBg = -1;
    for (let cellRow = 0; cellRow < rows; cellRow++) {
        const yTop = cellRow * 2;
        const yBot = Math.min(H - 1, yTop + 1);
        let line = "";
        prevFg = -1;
        prevBg = -1;
        for (let col = 0; col < W; col++) {
            const top = resized.getPixelColor(col, yTop);
            const bot = resized.getPixelColor(col, yBot);
            const rT = (top >>> 24) & 0xff;
            const gT = (top >>> 16) & 0xff;
            const bT = (top >>> 8) & 0xff;
            const rB = (bot >>> 24) & 0xff;
            const gB = (bot >>> 16) & 0xff;
            const bB = (bot >>> 8) & 0xff;
            // Pack 24-bit colours as ints so we can skip redundant SGR changes.
            const fg = (rT << 16) | (gT << 8) | bT;
            const bg = (rB << 16) | (gB << 8) | bB;
            if (fg !== prevFg || bg !== prevBg) {
                // SGR: 38;2;r;g;b for 24-bit fg, 48;2;r;g;b for 24-bit bg.
                line += `\x1b[38;2;${rT};${gT};${bT};48;2;${rB};${gB};${bB}m`;
                prevFg = fg;
                prevBg = bg;
            }
            line += HALF_BLOCK;
        }
        line += "\x1b[0m";
        lines.push(line);
    }
    return lines;
}
/**
 * Degraded monochrome fallback: luminance → ASCII density ramp.
 * Used when colour is disabled (--no-color).
 */
const PALETTE = " .,:;+*#%@\u2588";
function ansilizeMono(img, cols, rows) {
    if (cols <= 0 || rows <= 0)
        return [];
    const resized = img.clone().resize(cols, rows);
    const lines = [];
    for (let row = 0; row < rows; row++) {
        let line = "";
        for (let col = 0; col < cols; col++) {
            const px = resized.getPixelColor(col, row);
            const r = (px >>> 24) & 0xff;
            const g = (px >>> 16) & 0xff;
            const b = (px >>> 8) & 0xff;
            const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            const idx = Math.min(PALETTE.length - 1, Math.floor(lum * PALETTE.length));
            line += PALETTE[idx];
        }
        lines.push(line);
    }
    return lines;
}
//# sourceMappingURL=ansilize.js.map
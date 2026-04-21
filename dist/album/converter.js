"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertToAscii = convertToAscii;
// src/album/converter.ts
const jimp_1 = __importDefault(require("jimp"));
const ansilize_js_1 = require("./ansilize.js");
function computePadFingerprint(img) {
    const small = img.clone().resize(4, 4);
    const out = new Uint8Array(16);
    let totalLuma = 0;
    const luma = [];
    small.scan(0, 0, 4, 4, function (_x, _y, idx) {
        const rr = this.bitmap.data[idx];
        const gg = this.bitmap.data[idx + 1];
        const bb = this.bitmap.data[idx + 2];
        const y = 0.299 * rr + 0.587 * gg + 0.114 * bb;
        luma.push(y);
        totalLuma += y;
    });
    const mean = totalLuma / 16;
    for (let i = 0; i < 16; i++)
        out[i] = luma[i] >= mean ? 1 : 0;
    return out;
}
function renderAt(img, cols, rows, noColor) {
    if (cols <= 0 || rows <= 0)
        return [];
    return noColor ? (0, ansilize_js_1.ansilizeMono)(img, cols, rows) : (0, ansilize_js_1.ansilize)(img, cols, rows);
}
function renderAtHiRes(img, cols, rows, noColor) {
    if (cols <= 0 || rows <= 0)
        return [];
    // Quadrant blocks double horizontal resolution. Fall back to mono ramp
    // in --no-color mode since 2-colour-per-cell doesn't apply there.
    return noColor ? (0, ansilize_js_1.ansilizeMono)(img, cols, rows) : (0, ansilize_js_1.ansilizeQuadrant)(img, cols, rows);
}
/**
 * Convert a raw image buffer to an AsciiArt object, using the ansilize
 * half-block truecolor renderer.  Produces two renderings:
 *   - `lines` at album-art-mode size (~48% of viz width)
 *   - `playerLines` at player-mode screen-panel size
 */
async function convertToAscii(buffer, trackId, vizCols, vizRows, noColor, targetCols, targetRows) {
    const img = await jimp_1.default.read(buffer);
    // When the caller supplies target dimensions, use them verbatim so the
    // art fills the widget's interior exactly. Otherwise fall back to the
    // legacy size heuristics.
    let fullCols, fullRows;
    if (targetCols && targetRows) {
        fullCols = Math.max(1, targetCols);
        fullRows = Math.max(1, targetRows);
    }
    else {
        const fullCols0 = Math.max(1, Math.floor(vizCols * 0.48));
        fullRows = Math.max(1, Math.min(vizRows - 2, Math.floor(fullCols0 / 2.2)));
        fullCols = Math.max(1, Math.floor(fullRows * 2.2));
    }
    const playerCols = fullCols;
    const playerRows = fullRows;
    // Player mode: quadrant blocks (2× horizontal pixel density). Fullscreen
    // album-art mode keeps the half-block renderer — simpler output that
    // lets the user see the full image without chrome.
    const lines = renderAtHiRes(img, fullCols, fullRows, noColor);
    const playerLines = lines;
    const thumb = renderAt(img, 4, 2, noColor);
    const padFingerprint = computePadFingerprint(img);
    return {
        trackId,
        thumbnail: thumb,
        lines,
        fullCols,
        fullRows,
        playerLines,
        playerCols,
        playerRows,
        cols: vizCols,
        rows: vizRows,
        padFingerprint,
    };
}
//# sourceMappingURL=converter.js.map
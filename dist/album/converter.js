"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertToAscii = convertToAscii;
// src/album/converter.ts
const jimp_1 = __importDefault(require("jimp"));
const ansilize_js_1 = require("./ansilize.js");
function renderAt(img, cols, rows, noColor) {
    if (cols <= 0 || rows <= 0)
        return [];
    return noColor ? (0, ansilize_js_1.ansilizeMono)(img, cols, rows) : (0, ansilize_js_1.ansilize)(img, cols, rows);
}
/**
 * Convert a raw image buffer to an AsciiArt object, using the ansilize
 * half-block truecolor renderer.  Produces two renderings:
 *   - `lines` at album-art-mode size (~48% of viz width)
 *   - `playerLines` at player-mode screen-panel size
 */
async function convertToAscii(buffer, trackId, vizCols, vizRows, noColor) {
    const img = await jimp_1.default.read(buffer);
    // Fullscreen album-art mode: ~48% viz width, aspect-corrected.
    const fullCols0 = Math.max(1, Math.floor(vizCols * 0.48));
    const fullRows = Math.max(1, Math.min(vizRows - 2, Math.floor(fullCols0 / 2.2)));
    const fullCols = Math.max(1, Math.floor(fullRows * 2.2));
    // Player mode screen panel: roughly the screen sub-panel dimensions.
    // Chassis is ~58% of viz width, screen is ~58% of chassis interior → ~32%.
    // Height: roughly 8-10 rows (see renderChassis).
    const playerCols = Math.max(4, Math.min(40, Math.floor(vizCols * 0.28)));
    const playerRows = Math.max(3, Math.min(12, Math.floor(playerCols / 2.6)));
    const lines = renderAt(img, fullCols, fullRows, noColor);
    const playerLines = renderAt(img, playerCols, playerRows, noColor);
    const thumb = renderAt(img, 4, 2, noColor);
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
    };
}
//# sourceMappingURL=converter.js.map
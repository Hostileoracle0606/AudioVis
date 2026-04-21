"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderAlbumArt = renderAlbumArt;
const trackDna_js_1 = require("../trackDna.js");
const TL = "\u256D", TR = "\u256E", BL = "\u2570", BR = "\u256F";
const H = "\u2500", V = "\u2502";
/**
 * Framed square screen containing the whole album-art image. The frame
 * fills the provided region top-to-bottom; the art interior is
 * `region.width - 2` × `region.height - 2` cells, which the feeder sizes
 * to render a visually square image (cols = 2 × rows, since each
 * half-block cell represents 2 vertical pixels).
 */
function renderAlbumArt(r, region, state, theme) {
    const head = state.nowPlaying ?? state.recentlyPlayed[0];
    const idSrc = head ? `${head.trackName}|${head.artistName}` : "unknown";
    const cat = (0, trackDna_js_1.catalogNumber)(idSrc);
    const label = `[ screen \u00B7 ${cat} ]`;
    const frameX = region.x;
    const frameY = region.y;
    const frameW = region.width;
    const frameH = region.height;
    if (frameW < 6 || frameH < 3)
        return;
    const labelPad = Math.max(0, frameW - label.length - 4);
    r.write(frameX, frameY, `${theme.dim}${TL}${H}${label}${H.repeat(labelPad)}${H}${TR}${theme.reset}`);
    for (let y = frameY + 1; y < frameY + frameH - 1; y++) {
        r.write(frameX, y, `${theme.dim}${V}${theme.reset}`);
        r.write(frameX + frameW - 1, y, `${theme.dim}${V}${theme.reset}`);
    }
    r.write(frameX, frameY + frameH - 1, `${theme.dim}${BL}${H.repeat(frameW - 2)}${BR}${theme.reset}`);
    const artX = frameX + 1;
    const artY = frameY + 1;
    const artW = frameW - 2;
    const artH = frameH - 2;
    if (state.artCellMode === "blank") {
        const msg = "[ OFF ]";
        const cx = artX + Math.floor((artW - msg.length) / 2);
        const cy = artY + Math.floor(artH / 2);
        r.write(cx, cy, `${theme.dim}${msg}${theme.reset}`);
        return;
    }
    if (state.artCellMode === "vu") {
        const lvl = Math.round((state.meterL + state.meterR) / 2 * artH);
        for (let row = 0; row < artH; row++) {
            const y = artY + artH - 1 - row;
            const ch = row < lvl ? "\u2588".repeat(artW) : " ".repeat(artW);
            r.write(artX, y, `${theme.meter}${ch}${theme.reset}`);
        }
        return;
    }
    const art = state.albumArt;
    if (!art) {
        const msg = "\u2014 no art \u2014";
        const cx = artX + Math.floor((artW - msg.length) / 2);
        const cy = artY + Math.floor(artH / 2);
        r.write(cx, cy, `${theme.dim}${msg}${theme.reset}`);
        return;
    }
    const lines = art.lines;
    // Centre vertically within the art interior so shorter renderings don't
    // anchor to the top and expose empty rows at the bottom.
    const startY = artY + Math.max(0, Math.floor((artH - lines.length) / 2));
    for (let i = 0; i < Math.min(artH, lines.length); i++) {
        r.write(artX, startY + i, lines[i]);
    }
}
//# sourceMappingURL=albumArt.js.map
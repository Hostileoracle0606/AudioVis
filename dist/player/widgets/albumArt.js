"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderAlbumArt = renderAlbumArt;
const LABEL = "ALBUM ART";
function renderAlbumArt(r, region, state, theme) {
    const xi = region.x + 2;
    r.write(xi, region.y, `${theme.dim}${LABEL}${theme.reset}`);
    const artY = region.y + 2;
    const artX = region.x + 2;
    const artW = region.width - 4;
    const artH = region.height - 3;
    if (artW <= 0 || artH <= 0)
        return;
    if (state.artCellMode === "blank") {
        const msg = "[ OFF ]";
        const cx = region.x + Math.floor((region.width - msg.length) / 2);
        const cy = region.y + Math.floor(region.height / 2);
        r.write(cx, cy, `${theme.dim}${msg}${theme.reset}`);
        return;
    }
    if (state.artCellMode === "vu") {
        const bars = Math.max(1, artW);
        const lvl = Math.round((state.meterL + state.meterR) / 2 * artH);
        for (let row = 0; row < artH; row++) {
            const y = artY + artH - 1 - row;
            const ch = row < lvl ? "\u2588".repeat(bars) : " ".repeat(bars);
            r.write(artX, y, `${theme.meter}${ch}${theme.reset}`);
        }
        return;
    }
    const art = state.albumArt;
    if (!art) {
        const msg = "— no art —";
        const cx = region.x + Math.floor((region.width - msg.length) / 2);
        const cy = region.y + Math.floor(region.height / 2);
        r.write(cx, cy, `${theme.dim}${msg}${theme.reset}`);
        return;
    }
    const lines = art.lines;
    for (let i = 0; i < Math.min(artH, lines.length); i++) {
        r.write(artX, artY + i, lines[i]);
    }
}
//# sourceMappingURL=albumArt.js.map
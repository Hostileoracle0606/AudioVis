"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderSpectrum = renderSpectrum;
const NUM_BARS = 16;
const PALETTE_NAMES = ["AMBER", "TEAL", "MAGENTA", "MONO"];
function renderSpectrum(r, region, state, theme) {
    if (region.width < 20 || region.height < 5)
        return;
    const xi = region.x + 2;
    const paletteName = PALETTE_NAMES[state.spectrumPaletteIndex % PALETTE_NAMES.length];
    r.write(xi, region.y, `${theme.dim}[ SPECTRUM // ${paletteName} ]${theme.reset}`);
    const plotY = region.y + 2;
    const plotH = region.height - 3;
    const plotX = region.x + 2;
    const plotW = region.width - 4;
    const barW = Math.max(1, Math.floor(plotW / NUM_BARS));
    for (let b = 0; b < NUM_BARS; b++) {
        const mag = Math.max(0, Math.min(1, state.spectrum[b] ?? 0));
        const totalHalfRows = Math.round(mag * plotH * 2);
        const full = Math.floor(totalHalfRows / 2);
        const half = totalHalfRows % 2;
        const xStart = plotX + b * barW;
        const color = theme.spectrum[b];
        for (let i = 0; i < full; i++) {
            const y = plotY + plotH - 1 - i;
            r.write(xStart, y, `${color}${"\u2588".repeat(barW)}${theme.reset}`);
        }
        if (half > 0) {
            const y = plotY + plotH - 1 - full;
            r.write(xStart, y, `${color}${"\u2584".repeat(barW)}${theme.reset}`);
        }
    }
}
//# sourceMappingURL=spectrum.js.map
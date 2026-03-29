"use strict";
/**
 * Spectrum visualizer mode — classic vertical bar display.
 *
 * Renders N evenly-spaced bars centered in the visualizer region.
 * Bar height is driven by smoothedBuckets from the DSP pipeline.
 * Uses block characters (or ASCII fallback) for sub-row resolution.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderSpectrum = renderSpectrum;
// Width of each bar + gap
const BAR_WIDTH = 2;
const BAR_GAP = 1;
function renderSpectrum(state, renderer, region, theme) {
    const { numBars, smoothedBuckets } = state;
    const { x: rx, y: ry, width: RW, height: RH } = region;
    const totalBarsWidth = numBars * (BAR_WIDTH + BAR_GAP) - BAR_GAP;
    const startX = rx + Math.max(0, Math.floor((RW - totalBarsWidth) / 2));
    const useUnicode = !theme.palette.includes("@"); // unicode palette active
    for (let b = 0; b < numBars; b++) {
        const amp = smoothedBuckets[b] ?? 0;
        const barHeightFrac = amp * RH;
        const fullRows = Math.floor(barHeightFrac);
        const partial = barHeightFrac - fullRows; // 0..1
        const barX = startX + b * (BAR_WIDTH + BAR_GAP);
        if (barX >= rx + RW)
            break;
        for (let r = 0; r < fullRows && r < RH; r++) {
            const row = ry + RH - 1 - r;
            for (let bw = 0; bw < BAR_WIDTH; bw++) {
                const col = barX + bw;
                if (col >= rx + RW)
                    break;
                const isTop = r === fullRows - 1 && partial > 0;
                let ch;
                if (useUnicode) {
                    ch = isTop ? "\u2584" : "\u2588"; // ▄ or █
                }
                else {
                    ch = isTop ? "+" : "#";
                }
                const bright = theme.colorEnabled && r < 2;
                let cell = ch;
                if (bright)
                    cell = theme.bright + ch + theme.reset;
                else if (theme.colorEnabled)
                    cell = theme.normal + ch + theme.reset;
                renderer.write(col, row, cell);
            }
        }
        // Partial top row
        if (partial > 0.3 && fullRows < RH) {
            const row = ry + RH - 1 - fullRows;
            const ch = useUnicode ? "\u2581" : "."; // ▁
            for (let bw = 0; bw < BAR_WIDTH; bw++) {
                const col = barX + bw;
                if (col >= rx + RW)
                    break;
                const cell = theme.colorEnabled ? theme.dim + ch + theme.reset : ch;
                renderer.write(col, row, cell);
            }
        }
    }
    // Baseline
    const baseLine = ry + RH - 1;
    const lineChar = "-";
    for (let col = startX; col < startX + totalBarsWidth && col < rx + RW; col++) {
        // Only draw baseline where there's no bar
        const relX = col - startX;
        const barIdx = Math.floor(relX / (BAR_WIDTH + BAR_GAP));
        const posInBar = relX - barIdx * (BAR_WIDTH + BAR_GAP);
        if (posInBar >= BAR_WIDTH) {
            const cell = theme.colorEnabled ? theme.dim + lineChar + theme.reset : lineChar;
            renderer.write(col, baseLine, cell);
        }
    }
}
//# sourceMappingURL=spectrum.js.map
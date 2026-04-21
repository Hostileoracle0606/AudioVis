"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.distributeSlots = distributeSlots;
exports.reactiveMag = reactiveMag;
exports.renderSpectrum = renderSpectrum;
const theme_js_1 = require("../theme.js");
const peakHold_js_1 = require("../peakHold.js");
const NUM_BARS = 16;
const PALETTE_NAMES = ["amber", "teal", "magenta", "mono"];
const HZ_LABELS = ["62", "125", "250", "500", "1k", "2k", "4k", "8k"];
// Perceptual boost: gamma < 1 raises small magnitudes disproportionately,
// so quiet high-frequency bins feel alive instead of flat. Lowered from
// 0.55 → 0.40 to keep typical content in the *upper* half of the plot
// instead of pooling near the bottom.
const GAMMA = 0.40;
// Pre-gain applied before gamma — expands the effective dynamic range
// so a bin at ~0.3 raw now fills ~75 % of the plot height.
const PRE_GAIN = 1.3;
// Tilt: scale high bins up to compensate for natural pink-noise rolloff.
// Bin 0 unchanged; bin NUM_BARS-1 multiplied by (1 + TILT_MAX). Bumped
// so treble content also reaches a healthy plot height.
const TILT_MAX = 1.5;
// Transient flash: on sync/clip hits, briefly push bars harder.
const FLASH_GAIN = 1.15;
// Saturation threshold: above this magnitude, bar colour switches to accentBright.
const HOT_THRESHOLD = 0.7;
let holdBuf = null;
/**
 * Distribute `plotW` cells across `n` slots such that every cell is used
 * exactly once. Returns {x, w} per slot; Σ w === plotW.
 */
function distributeSlots(plotX, plotW, n) {
    const out = [];
    for (let b = 0; b < n; b++) {
        const s = Math.floor((b * plotW) / n);
        const e = Math.floor(((b + 1) * plotW) / n);
        out.push({ x: plotX + s, w: Math.max(1, e - s) });
    }
    return out;
}
/**
 * Apply the reactive magnitude curve: clamp → gamma → tilt → optional flash.
 * Result is clamped to [0, 1].
 */
function reactiveMag(raw, binIdx, totalBins, flash) {
    const clamped = Math.max(0, Math.min(1, raw));
    const boosted = Math.min(1, clamped * PRE_GAIN);
    const gamma = Math.pow(boosted, GAMMA);
    const tilt = 1 + TILT_MAX * (totalBins <= 1 ? 0 : binIdx / (totalBins - 1));
    let m = gamma * tilt;
    if (flash)
        m *= FLASH_GAIN;
    return Math.max(0, Math.min(1, m));
}
function renderSpectrum(r, region, state, theme, accent) {
    if (region.width < 20 || region.height < 6)
        return;
    const xi = region.x + 2;
    const paletteName = PALETTE_NAMES[state.spectrumPaletteIndex % PALETTE_NAMES.length];
    const peak = state.meterL > state.meterR ? state.meterL : state.meterR;
    const peakDb = peak > 0 ? (20 * Math.log10(peak)).toFixed(1) : "-inf";
    r.write(xi, region.y, `${theme.dim}[ spectrum \u00B7 16b \u00B7 ${paletteName} \u00B7 peak ${peakDb} dbtp ]${theme.reset}`);
    const plotY = region.y + 2;
    const plotH = Math.max(1, region.height - 3); // reclaim the row formerly between bars and footer
    const plotX = region.x + 2;
    const plotW = Math.max(NUM_BARS, region.width - 4);
    const slots = distributeSlots(plotX, plotW, NUM_BARS);
    const flash = accent.has("sync") || accent.has("clip");
    if (!holdBuf)
        holdBuf = (0, peakHold_js_1.createPeakHold)(NUM_BARS);
    (0, peakHold_js_1.updatePeakHold)(holdBuf, state.spectrum, Date.now(), 1500);
    // Hz labels: place each label at the centre of every other slot pair.
    const labelRow = region.y + 1;
    for (let li = 0; li < HZ_LABELS.length; li++) {
        const slot = slots[li * 2] ?? slots[slots.length - 1];
        r.write(slot.x, labelRow, `${theme.dim}${HZ_LABELS[li]}${theme.reset}`);
    }
    for (let b = 0; b < NUM_BARS; b++) {
        const mag = reactiveMag(state.spectrum[b] ?? 0, b, NUM_BARS, flash);
        const totalHalfRows = Math.round(mag * plotH * 2);
        const full = Math.floor(totalHalfRows / 2);
        const half = totalHalfRows % 2;
        const { x: xStart, w: barW } = slots[b];
        const isBass = b === 0 && accent.has("bass-bin");
        let color;
        if (isBass)
            color = theme.accentBright;
        else if (mag >= HOT_THRESHOLD)
            color = theme.accentBright;
        else
            color = theme.spectrum[b];
        for (let i = 0; i < full; i++) {
            const y = plotY + plotH - 1 - i;
            r.write(xStart, y, `${color}${"\u2588".repeat(barW)}${theme.reset}`);
        }
        if (half > 0) {
            const y = plotY + plotH - 1 - full;
            r.write(xStart, y, `${color}${"\u2584".repeat(barW)}${theme.reset}`);
        }
        const held = holdBuf.values[b];
        if (held > 0) {
            const heldAdj = reactiveMag(held, b, NUM_BARS, false);
            const heldRowRaw = Math.floor(Math.round(heldAdj * plotH * 2) / 2);
            const rowIdx = Math.max(0, Math.min(plotH - 1, heldRowRaw));
            const y = plotY + plotH - 1 - rowIdx;
            // Centre the dot inside the slot for cleaner alignment on wide bars.
            const dotX = xStart + Math.floor((barW - 1) / 2);
            r.write(dotX, y, `${theme.accent}\u25CF${theme.reset}`);
        }
    }
    const fy = region.y + region.height - 1;
    // Tally-light blink on the ● — same shared cadence as the now-playing
    // header so both indicators pulse together, in the theme's accent.
    const dotColor = (0, theme_js_1.blinkColor)(theme, Date.now());
    r.write(xi, fy, `${dotColor}\u25CF${theme.reset}${theme.dim} peak-hold \u00B7 2s \u00B7 \u25E6 reset \u25E6 tilt \u25E6 a-weight${theme.reset}`);
}
//# sourceMappingURL=spectrum.js.map
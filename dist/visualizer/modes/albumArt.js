"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderAlbumArt = renderAlbumArt;
const wavefield_js_1 = require("./wavefield.js");
const format_js_1 = require("../../ui/format.js");
/**
 * Render the album-art overlay mode.
 *
 * Layout (within the visualizer region):
 *   [plasma background at 0.15× amplitude]
 *   left 48%  : ASCII art, centered vertically
 *   col W/2-1 : vertical divider
 *   right 52% : now-playing panel (track, artist, album, progress, controls)
 */
function renderAlbumArt(state, renderer, region, theme) {
    const { x: rx, y: ry, width: RW, height: RH } = region;
    // ── 1. Plasma background (wavefield at 0.15× amplitude) ───────────────────
    const dimState = {
        ...state,
        amplitude: state.amplitude * 0.15,
        low: state.low * 0.15,
        mid: state.mid * 0.15,
        high: state.high * 0.15,
        pulse: 0,
    };
    (0, wavefield_js_1.renderWavefield)(dimState, renderer, region, theme);
    // ── 2. Compute column boundaries ──────────────────────────────────────────
    const artColWidth = Math.floor(RW * 0.48);
    const dividerCol = rx + artColWidth;
    const infoColStart = dividerCol + 1;
    const infoColWidth = RW - artColWidth - 1;
    // ── 3. Vertical divider ───────────────────────────────────────────────────
    for (let row = 0; row < RH; row++) {
        renderer.write(dividerCol, ry + row, "│");
    }
    // ── 4. ASCII art (left panel) ─────────────────────────────────────────────
    if (state.albumArt) {
        const artLines = state.albumArt.lines;
        const artH = artLines.length;
        const vertOffset = Math.max(0, Math.floor((RH - artH) / 2));
        for (let i = 0; i < artLines.length; i++) {
            const row = ry + vertOffset + i;
            if (row >= ry + RH)
                break;
            renderer.write(rx, row, artLines[i]);
        }
    }
    else {
        // No art available — show placeholder
        const msg = "No art";
        const midRow = ry + Math.floor(RH / 2);
        const midCol = rx + Math.floor((artColWidth - msg.length) / 2);
        renderer.write(midCol, midRow, msg);
    }
    // ── 5. Now-playing panel (right panel) ────────────────────────────────────
    const colX = infoColStart + 2; // 2-char left padding inside panel
    const maxW = infoColWidth - 3;
    let panelRow = ry + Math.max(1, Math.floor(RH / 2) - 5);
    // "NOW PLAYING" label
    renderer.write(colX, panelRow, "NOW PLAYING");
    panelRow += 2;
    // Track name (large — written as-is, truncated)
    renderer.write(colX, panelRow, (0, format_js_1.truncateMiddle)(state.trackName, maxW));
    panelRow += 1;
    // Artist
    renderer.write(colX, panelRow, (0, format_js_1.truncateMiddle)(state.artistName, maxW));
    panelRow += 1;
    // Album
    renderer.write(colX, panelRow, (0, format_js_1.truncateMiddle)(state.albumName, maxW));
    panelRow += 2;
    // Progress bar
    if (state.durationMs > 0) {
        const progress = state.progressMs / state.durationMs;
        const barW = Math.max(4, maxW - 14); // leave room for timestamps
        const filled = Math.round(progress * barW);
        const empty = barW - filled;
        const elapsed = (0, format_js_1.formatSeconds)(state.progressMs / 1000);
        const total = (0, format_js_1.formatSeconds)(state.durationMs / 1000);
        const bar = elapsed + " " + "─".repeat(filled) + "●" + "─".repeat(empty) + " " + total;
        renderer.write(colX, panelRow, (0, format_js_1.truncateMiddle)(bar, maxW));
        panelRow += 2;
    }
    // Playback controls
    const controls = state.isPlaying
        ? "⏮  [p]rev    ⏸  [space]    [n]ext  ⏭"
        : "⏮  [p]rev    ▶  [space]    [n]ext  ⏭";
    renderer.write(colX, panelRow, (0, format_js_1.truncateMiddle)(controls, maxW));
    panelRow += 2;
    // Close hint
    renderer.write(colX, panelRow, "[a] or click header to close");
}
//# sourceMappingURL=albumArt.js.map
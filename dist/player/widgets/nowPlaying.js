"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderNowPlaying = renderNowPlaying;
function truncate(s, max) {
    return s.length <= max ? s : s.slice(0, Math.max(0, max - 1)) + "\u2026";
}
function fmtMs(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(s / 60);
    const ss = (s % 60).toString().padStart(2, "0");
    return `${m}:${ss}`;
}
function stereoSeparator(label, width) {
    const inner = ` ${label} `;
    const dashes = Math.max(0, width - inner.length);
    const left = Math.floor(dashes / 2);
    const right = dashes - left;
    return "\u2500".repeat(left) + inner + "\u2500".repeat(right);
}
function vuBar(level, width) {
    const clamped = Math.max(0, Math.min(1, level));
    const fill = Math.round(clamped * width);
    let out = "";
    for (let i = 0; i < width; i++) {
        if (i < fill) {
            out += i < fill - 2 ? "\u2588" : i < fill - 1 ? "\u2593" : "\u2592";
        }
        else {
            out += "\u00B7";
        }
    }
    return out;
}
function renderNowPlaying(r, region, state, theme) {
    if (region.width < 16 || region.height < 5)
        return;
    const xi = region.x + 2;
    const pad = region.width - 4;
    // Row 0: panel label
    r.write(xi, region.y, `${theme.dim}[ NOW PLAYING ]${theme.reset}`);
    // Row 1: playback status left + elapsed/total right
    const status = state.isPlaying ? "[ PLAYING ]" : "[ PAUSED ]";
    r.write(xi, region.y + 1, `${theme.accent}${status}${theme.reset}`);
    if (state.durationMs > 0) {
        const timeStr = `${fmtMs(state.progressMs)} / ${fmtMs(state.durationMs)}`;
        const tx = region.x + region.width - 2 - timeStr.length;
        r.write(tx, region.y + 1, `${theme.dim}${timeStr}${theme.reset}`);
    }
    if (!state.nowPlaying) {
        r.write(xi, region.y + 3, `${theme.dim}\u2014 no track \u2014${theme.reset}`);
        return;
    }
    const np = state.nowPlaying;
    // Rows 3-5: track / artist / album without field-label prefixes
    r.write(xi, region.y + 3, `${theme.fg}${truncate(np.trackName, pad)}${theme.reset}`);
    r.write(xi, region.y + 4, `${theme.dim}${truncate(np.artistName, pad)}${theme.reset}`);
    r.write(xi, region.y + 5, `${theme.dim}${truncate("from " + np.albumName, pad)}${theme.reset}`);
    if (region.height < 9)
        return;
    // Row 7: ──[ STEREO ]── separator
    r.write(xi, region.y + 7, `${theme.dim}${stereoSeparator("[ STEREO ]", pad)}${theme.reset}`);
    // Rows 8-9: L/R VU meters with dotted fill and % readout
    const pctW = 4;
    const barW = Math.max(4, pad - 4 - pctW);
    const renderMeter = (label, level, y) => {
        const pct = Math.round(level * 100).toString().padStart(3, " ") + "%";
        const bar = vuBar(level, barW);
        r.write(xi, y, `${theme.dim}${label} |${theme.reset}${theme.meter}${bar}${theme.reset}${theme.dim}| ${pct}${theme.reset}`);
    };
    renderMeter("L", state.meterL, region.y + 8);
    if (region.height >= 10)
        renderMeter("R", state.meterR, region.y + 9);
}
//# sourceMappingURL=nowPlaying.js.map
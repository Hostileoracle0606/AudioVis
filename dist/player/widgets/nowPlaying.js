"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderNowPlaying = renderNowPlaying;
function truncate(s, max) {
    return s.length <= max ? s : s.slice(0, Math.max(0, max - 1)) + "…";
}
function gradientBar(level, width) {
    const clamped = Math.max(0, Math.min(1, level));
    const fill = Math.round(clamped * width);
    let out = "";
    for (let i = 0; i < width; i++) {
        if (i < fill - 2)
            out += "\u2588";
        else if (i < fill - 1)
            out += "\u2593";
        else if (i < fill)
            out += "\u2592";
        else
            out += "\u2591";
    }
    return out;
}
const LABEL = "NOW PLAYING";
function renderNowPlaying(r, region, state, theme) {
    if (region.width < 16 || region.height < 5)
        return;
    const xi = region.x + 2;
    r.write(xi, region.y, `${theme.dim}${LABEL}${theme.reset}`);
    if (!state.nowPlaying) {
        r.write(xi, region.y + 2, `${theme.dim}— no track —${theme.reset}`);
        return;
    }
    const np = state.nowPlaying;
    const pad = region.width - 4;
    r.write(xi, region.y + 2, `${theme.fg}TITLE:  ${truncate(np.trackName, pad - 8)}${theme.reset}`);
    r.write(xi, region.y + 3, `${theme.fg}ARTIST: ${truncate(np.artistName, pad - 8)}${theme.reset}`);
    r.write(xi, region.y + 4, `${theme.fg}ALBUM:  ${truncate(np.albumName, pad - 8)}${theme.reset}`);
    r.write(xi, region.y + 5, `${theme.dim}FMT:    stream ${(Math.round((np.durationMs || 0) / 1000))}s${theme.reset}`);
    if (region.height >= 9) {
        r.write(xi, region.y + 7, `${theme.dim}MASTER OUT${theme.reset}`);
        const barW = Math.max(4, pad - 5);
        r.write(xi, region.y + 8, `${theme.meter}L [${gradientBar(state.meterL, barW)}]${theme.reset}`);
        if (region.height >= 10) {
            r.write(xi, region.y + 9, `${theme.meter}R [${gradientBar(state.meterR, barW)}]${theme.reset}`);
        }
    }
}
//# sourceMappingURL=nowPlaying.js.map
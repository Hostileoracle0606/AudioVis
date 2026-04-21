"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderRecentlyPlayed = renderRecentlyPlayed;
function renderRecentlyPlayed(r, region, state, theme) {
    if (region.width < 10)
        return;
    const xi = region.x + 2;
    r.write(xi, region.y, `${theme.dim}[ RECENT ]${theme.reset}`);
    const maxRows = Math.min(8, region.height - 2);
    const itemW = region.width - 4;
    for (let i = 0; i < maxRows; i++) {
        const entry = state.recentlyPlayed[i];
        const num = String(i + 1).padStart(2, "0");
        const line = entry ? `${num}. ${entry.trackName}` : "";
        const truncated = line.length > itemW ? line.slice(0, itemW - 1) + "\u2026" : line;
        r.write(xi, region.y + 2 + i, `${theme.dim}${truncated}${theme.reset}`);
    }
}
//# sourceMappingURL=recentlyPlayed.js.map
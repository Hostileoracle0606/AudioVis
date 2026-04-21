"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderTitleBar = renderTitleBar;
function renderTitleBar(r, L, state, theme) {
    const brand = "[ TUI.AMP v4.0 ]";
    r.write(L.brandR.x, L.brandR.y, `${theme.accent}${brand}${theme.reset}`);
    const sx = L.searchR.x;
    const sy = L.searchR.y;
    const sw = L.searchR.width;
    if (sw > 4) {
        if (state.search.focused) {
            const prefix = "> ";
            const visible = state.search.query.slice(-(sw - prefix.length - 1));
            r.write(sx + 1, sy, `${theme.fg}${prefix}${visible}${theme.reset}`);
        }
        else {
            const hint = "(press / to search)";
            if (hint.length + 2 <= sw) {
                r.write(sx + 1, sy, `${theme.dim}${hint}${theme.reset}`);
            }
        }
    }
    const cpu = state.cpuPct.toFixed(1).padStart(4, " ");
    const right = `SYS.LOAD: ${cpu}%`;
    const rx = L.sysLoadR.x + Math.max(0, L.sysLoadR.width - right.length);
    r.write(rx, L.sysLoadR.y, `${theme.dim}${right}${theme.reset}`);
}
//# sourceMappingURL=titleBar.js.map
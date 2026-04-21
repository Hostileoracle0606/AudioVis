"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderTitleBar = renderTitleBar;
const trackDna_js_1 = require("../trackDna.js");
function renderTitleBar(r, L, state, theme, accent) {
    const cat = state.nowPlaying
        ? (0, trackDna_js_1.catalogNumber)(`${state.nowPlaying.trackName}|${state.nowPlaying.artistName}`)
        : "000";
    const brand = `[ TUI\u00B7AMP \u25E6 ${cat} ]`;
    const syncColor = accent.has("sync") ? theme.accent : theme.dim;
    const ledStrip = `${theme.dim}\u25E6in\u25CF ${theme.reset}${theme.dim}\u25E6out\u25CF ${theme.reset}${syncColor}\u25E6sync\u25CF${theme.reset}${theme.dim} \u25E6midi\u25CF${theme.reset}`;
    r.write(L.brandR.x, L.brandR.y, `${theme.accent}${brand}${theme.reset} ${ledStrip}`);
    // Centred key legend — occupies the former search-bar slot so the
    // controls sit at eye-level instead of below the scrubber. Progressive
    // shortening: try the long version first, then the medium, then short —
    // whichever fits the slot.
    const sx = L.searchR.x;
    const sy = L.searchR.y;
    const sw = L.searchR.width;
    if (sw > 4) {
        const options = [
            "[p]lay  [n]ext  [b]ack  [m]ute  [v]is  [a]rt  [1-8]pad  [q]uit",
            "[p]lay  [n]xt  [b]ck  [m]ute  [v]is  [a]rt  [q]uit",
            "[p]lay  [n]ext  [b]ack  [m]ute  [q]uit",
            "[p]lay [n]xt [b]ck [m]ute [q]uit",
            "p/n/b/m/q",
        ];
        const legend = options.find((s) => s.length <= sw - 2) ?? options[options.length - 1];
        const lx = sx + Math.max(1, Math.floor((sw - legend.length) / 2));
        r.write(lx, sy, `${theme.dim}${legend}${theme.reset}`);
    }
    const cpu = state.cpuPct.toFixed(1).padStart(4, " ");
    const rms = state.rms.toFixed(2);
    const right = `[ cpu\u00B7${cpu} \u00B7 rms\u00B7${rms} \u00B7 lufs\u00B7-8 ]`;
    const rx = L.sysLoadR.x + Math.max(0, L.sysLoadR.width - right.length);
    r.write(rx, L.sysLoadR.y, `${theme.dim}${right}${theme.reset}`);
}
//# sourceMappingURL=titleBar.js.map
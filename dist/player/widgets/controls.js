"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderControls = renderControls;
// Greyscale shade ramp — from sparsest to densest. Drawing the played
// portion as a gradient of shades (far past = lightest, near playhead =
// densest) reads as a faded trail without any colour.
const SHADE_RAMP = ["\u2591", "\u2592", "\u2593", "\u2588"]; // ░ ▒ ▓ █
// Eighth-block ramp for the playhead sub-column — same principle as
// before, gives sub-cell progress precision.
const BLOCK_FADE = [" ", "\u258F", "\u258E", "\u258D", "\u258C", "\u258B", "\u258A", "\u2589", "\u2588"];
// 256-colour greyscale ramp used alongside the shade glyphs for a
// subtle depth gradient — dimmest at the far-left of the played portion,
// brightest at the playhead.
const GREY_RAMP = [238, 242, 246, 250, 253];
const SGR = (n) => `\x1b[38;5;${n}m`;
function fmtMs(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(s / 60);
    const ss = (s % 60).toString().padStart(2, "0");
    const mm = m.toString().padStart(2, "0");
    return `${mm}:${ss}`;
}
function renderControls(r, L, state, theme) {
    const left = fmtMs(state.progressMs);
    const right = fmtMs(state.durationMs);
    const y = L.scrubR.y;
    const x0 = L.scrubR.x + 1;
    const xLast = L.scrubR.x + L.scrubR.width - 2;
    r.write(x0, y, `${theme.fg}${left}${theme.reset}`);
    r.write(xLast - right.length + 1, y, `${theme.fg}${right}${theme.reset}`);
    const waveX0 = x0 + left.length + 1;
    const waveX1 = xLast - right.length - 1;
    const waveW = Math.max(0, waveX1 - waveX0);
    const pct = state.durationMs > 0 ? Math.min(1, state.progressMs / state.durationMs) : 0;
    const exactFill = pct * waveW; // fractional column position of the playhead
    const fullCols = Math.floor(exactFill);
    const subFrac = exactFill - fullCols; // 0..1 within the current column
    for (let x = 0; x < waveW; x++) {
        const absX = waveX0 + x;
        let glyph;
        let color;
        if (x < fullCols) {
            // Played portion: pick a shade (░▒▓█) based on how close this
            // column is to the playhead — far-past = ░ (sparse), near =
            // ▓, right before playhead = █. Greyscale SGR tint adds subtle
            // depth without any colour.
            const t = x / Math.max(1, fullCols);
            const shadeIdx = Math.min(SHADE_RAMP.length - 1, Math.floor(t * SHADE_RAMP.length));
            const greyIdx = Math.min(GREY_RAMP.length - 1, Math.floor(t * GREY_RAMP.length));
            glyph = SHADE_RAMP[shadeIdx];
            color = SGR(GREY_RAMP[greyIdx]);
        }
        else if (x === fullCols) {
            // Playhead column: eighth-block fill showing sub-column progress,
            // painted in the brightest grey tier.
            const eighths = Math.max(0, Math.min(8, Math.round(subFrac * 8)));
            color = SGR(GREY_RAMP[GREY_RAMP.length - 1]);
            glyph = BLOCK_FADE[eighths];
        }
        else {
            // Future portion: dim dotted track so the baseline stays visible.
            color = theme.dim;
            glyph = "\u00B7";
        }
        r.write(absX, y, `${color}${glyph}${theme.reset}`);
    }
    // Key legend lives in the title-bar now (title-row search slot was
    // repurposed). Bottom row is just the LED chaser strip.
    const ledCount = 21;
    const ledX0 = L.keysR.x + L.keysR.width - ledCount * 2 - 1;
    for (let i = 0; i < ledCount; i++) {
        const x = ledX0 + i * 2;
        const lit = i === state.ledChaserIndex && state.isPlaying;
        const ch = lit ? `${theme.accent}\u25CF${theme.reset}` : `${theme.dim}\u00B7${theme.reset}`;
        r.write(x, L.keysR.y, ch);
    }
}
//# sourceMappingURL=controls.js.map
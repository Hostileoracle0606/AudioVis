"use strict";
/**
 * Record-player deck widget — occupies the left 50 % of the main body.
 *
 * Internal vertical layout (top → bottom, within the outer border):
 *   now-playing strip  (2 rows)
 *   platter + tonearm  (~40 % of inner height)
 *   mid-divider row    (1 row: progress bar left, grille right)
 *   album-art screen   (remaining rows)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderRecordDeck = renderRecordDeck;
const tui_js_1 = require("../../ui/tui.js");
const format_js_1 = require("../../ui/format.js");
const songTheme_js_1 = require("../songTheme.js");
// ─── helpers ─────────────────────────────────────────────────────────────────
function st(text, colour, reset) {
    return colour ? colour + text + reset : text;
}
function drawBox(renderer, r, label, colour, reset) {
    const { x, y, width: W, height: H } = r;
    if (W < 4 || H < 2)
        return;
    const labelTxt = label ? ` ${label} ` : "";
    const dashes = Math.max(0, W - 2 - labelTxt.length);
    const topInner = "\u2500".repeat(Math.floor(dashes / 2)) + labelTxt + "\u2500".repeat(dashes - Math.floor(dashes / 2));
    renderer.write(x, y, st(`\u256D${topInner}\u256E`, colour, reset));
    for (let row = 1; row < H - 1; row++) {
        renderer.write(x, y + row, st("\u2502", colour, reset));
        renderer.write(x + W - 1, y + row, st("\u2502", colour, reset));
    }
    renderer.write(x, y + H - 1, st(`\u2570${"\u2500".repeat(Math.max(0, W - 2))}\u256F`, colour, reset));
}
// ─── now-playing strip ───────────────────────────────────────────────────────
function renderNowPlaying(state, renderer, r) {
    const { x, y, width: W } = r;
    const song = state.songTheme;
    if (state.trackName) {
        const title = (0, format_js_1.truncateMiddle)(`${state.trackName}  \u2014  ${state.artistName}`, Math.max(1, W - 4));
        renderer.write(x + 2, y, st(title, song.normal, song.reset));
        const sub = (0, format_js_1.truncateMiddle)(state.albumName, Math.max(1, W - 4));
        renderer.write(x + 2, y + 1, st(sub, song.dim, song.reset));
    }
    else {
        renderer.write(x + 2, y, st("  now playing: nothing active", song.dim, song.reset));
        renderer.write(x + 2, y + 1, st("  state: idle", song.dim, song.reset));
    }
}
// ─── knobs row ───────────────────────────────────────────────────────────────
function renderKnobs(state, renderer, r) {
    const { x, y, width: W } = r;
    const song = state.songTheme;
    const left = "\u25C9 tempo";
    const right = "\u25C9 volume";
    renderer.write(x + 2, y, st(left, song.dim, song.reset));
    if (x + W - right.length - 3 > x + 2 + left.length) {
        renderer.write(x + W - right.length - 3, y, st(right, song.dim, song.reset));
    }
}
// ─── turntable ───────────────────────────────────────────────────────────────
function renderTurntable(state, renderer, r) {
    const song = state.songTheme;
    const cx = r.x + Math.floor(r.width / 2);
    const cy = r.y + Math.floor(r.height / 2);
    const rX = Math.max(4, Math.floor(r.width * 0.42));
    const rY = Math.max(2, Math.floor(r.height * 0.42));
    // Rotating accent pip on the outer edge
    const pipAngle = state.isPlaying ? state.platterPhase * Math.PI * 2 : 0;
    const pipX = cx + Math.round(Math.cos(pipAngle) * rX);
    const pipY = cy + Math.round(Math.sin(pipAngle) * rY);
    // Outer dotted ellipse
    const STEPS = 48;
    for (let i = 0; i < STEPS; i++) {
        const t = (i / STEPS) * Math.PI * 2;
        const px = cx + Math.round(Math.cos(t) * rX);
        const py = cy + Math.round(Math.sin(t) * rY);
        if (px < r.x || px >= r.x + r.width || py < r.y || py >= r.y + r.height)
            continue;
        renderer.write(px, py, st("\u00B7", song.dim, song.reset));
    }
    // Groove rings (4 concentric dashes between outer edge and label)
    const lRX = Math.max(3, Math.floor(rX * 0.34));
    const lRY = Math.max(1, Math.floor(rY * 0.45));
    for (let g = 1; g <= 4; g++) {
        const f = g / 5;
        const gRX = Math.round(lRX + (rX - lRX) * (1 - f));
        const gRY = Math.max(lRY + 1, Math.round(lRY + (rY - lRY) * (1 - f)));
        const gS = Math.max(24, gRX * 4);
        for (let i = 0; i < gS; i++) {
            if (i % 2 === 0)
                continue;
            const t = (i / gS) * Math.PI * 2;
            const px = cx + Math.round(Math.cos(t) * gRX);
            const py = cy + Math.round(Math.sin(t) * gRY);
            if (px < r.x || px >= r.x + r.width || py < r.y || py >= r.y + r.height)
                continue;
            renderer.write(px, py, st("\u2500", song.dim, song.reset));
        }
    }
    // Label (inner rounded box)
    const labelW = Math.min(r.width - 4, lRX * 2 + 1);
    const labelH = Math.min(r.height - 4, lRY * 2 + 1);
    if (labelW >= 8 && labelH >= 3) {
        const lx = cx - Math.floor(labelW / 2);
        const ly = cy - Math.floor(labelH / 2);
        for (let row = 0; row < labelH; row++) {
            for (let col = 0; col < labelW; col++) {
                renderer.write(lx + col, ly + row, " ");
            }
        }
        drawBox(renderer, { x: lx, y: ly, width: labelW, height: labelH }, "", song.dim, song.reset);
        const trkNum = state.currentTrackId
            ? String((0, songTheme_js_1.hashTrackId)(state.currentTrackId) % 1000).padStart(3, "0")
            : "000";
        const iW = labelW - 4;
        const labelLines = [
            "side a".padStart(Math.floor((iW + 6) / 2)).slice(0, iW),
            ("\u2756 \u00B7 33\u2153").padStart(Math.floor((iW + 8) / 2)).slice(0, iW),
            (`track ${trkNum}`).padStart(Math.floor((iW + 9) / 2)).slice(0, iW),
        ];
        for (let i = 0; i < Math.min(labelLines.length, labelH - 2); i++) {
            renderer.write(lx + 2, ly + 1 + i, st(labelLines[i], song.dim, song.reset));
        }
    }
    // Spindle
    renderer.write(cx, cy, st("\u2756", song.dim, song.reset));
    // Rotating pip (accent)
    if (state.isPlaying) {
        const c = song.accent || song.bright;
        if (pipX >= r.x && pipX < r.x + r.width && pipY >= r.y && pipY < r.y + r.height) {
            renderer.write(pipX, pipY, st("\u25CF", c, song.reset));
        }
    }
}
// ─── tonearm ─────────────────────────────────────────────────────────────────
function renderTonearm(state, renderer, r) {
    const song = state.songTheme;
    const cx = r.x + Math.floor(r.width / 2);
    const cy = r.y + Math.floor(r.height / 2);
    const rX = Math.max(4, Math.floor(r.width * 0.42));
    const rY = Math.max(2, Math.floor(r.height * 0.42));
    const pivotX = r.x + r.width - 3;
    const pivotY = r.y + 2;
    const prog = state.durationMs > 0
        ? Math.max(0, Math.min(1, state.progressMs / state.durationMs))
        : 0;
    const angle = Math.PI * (0.05 + (1 - prog) * 0.35);
    const tR = { x: rX * (0.55 + prog * 0.35), y: rY * (0.55 + prog * 0.35) };
    const cartX = cx + Math.round(Math.cos(angle) * tR.x);
    const cartY = cy - Math.round(Math.sin(angle) * tR.y);
    if (pivotX >= r.x && pivotX < r.x + r.width && pivotY >= r.y && pivotY < r.y + r.height) {
        renderer.write(pivotX, pivotY, st("\u25EF", song.normal, song.reset));
    }
    const dx = cartX - pivotX;
    const dy = cartY - pivotY;
    const steps = Math.max(Math.abs(dx), Math.abs(dy));
    for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const x = Math.round(pivotX + dx * t);
        const y = Math.round(pivotY + dy * t);
        if (x < r.x || x >= r.x + r.width || y < r.y || y >= r.y + r.height)
            continue;
        renderer.write(x, y, st("\u2571", song.normal, song.reset));
    }
    const cartColour = state.isPlaying ? (song.accent || song.bright) : song.dim;
    if (cartX >= r.x && cartX < r.x + r.width && cartY >= r.y && cartY < r.y + r.height) {
        renderer.write(cartX, cartY, st("\u2590", cartColour, song.reset));
    }
}
// ─── mid-divider ─────────────────────────────────────────────────────────────
function renderMidProgress(state, renderer, r) {
    const { x, y, width: W } = r;
    if (W < 6)
        return;
    const song = state.songTheme;
    const prog = state.durationMs > 0 ? state.progressMs / state.durationMs : 0;
    const elapsed = (0, format_js_1.formatSeconds)(state.progressMs / 1000);
    const total = (0, format_js_1.formatSeconds)(state.durationMs / 1000);
    const timeW = elapsed.length + total.length + 3; // "EL / TO"
    const barW = Math.max(1, W - timeW - 2);
    const filled = Math.round(prog * barW);
    const bar = "\u2593".repeat(filled) + "\u2591".repeat(barW - filled);
    const line = `${elapsed} ${bar} ${total}`;
    renderer.write(x + 1, y, st(line.slice(0, W - 1), song.normal, song.reset));
}
function renderMidGrille(state, renderer, r, now) {
    const { x, y, width: W } = r;
    if (W < 2)
        return;
    const song = state.songTheme;
    const beatAge = now - state.lastPulseMs;
    const hot = beatAge < 150 && state.lastPulseStrength > 0.4;
    const colour = hot ? (song.bright || song.normal) : song.dim;
    let line = "";
    for (let c = 0; c < W; c++) {
        line += c % 4 === 3 ? " " : ")";
    }
    renderer.write(x, y, st(line.slice(0, W), colour, song.reset));
}
// ─── album-art screen ────────────────────────────────────────────────────────
function renderAlbumArtScreen(state, renderer, r) {
    const song = state.songTheme;
    drawBox(renderer, r, "screen", song.dim, song.reset);
    const ix = r.x + 1;
    const iy = r.y + 1;
    const iW = r.width - 2;
    const iH = r.height - 2;
    if (iW <= 0 || iH <= 0)
        return;
    const art = state.albumArt;
    if (art && art.playerLines.length > 0) {
        const lines = art.playerLines;
        const artH = Math.min(lines.length, iH);
        const yOff = Math.floor((iH - artH) / 2);
        const xOff = Math.max(0, Math.floor((iW - art.playerCols) / 2));
        for (let i = 0; i < artH; i++) {
            renderer.write(ix + xOff, iy + yOff + i, lines[i]);
        }
    }
    else {
        const mark = "audio\u00B7vis";
        renderer.write(ix + Math.max(0, Math.floor((iW - mark.length) / 2)), iy + Math.floor(iH / 2), st(mark, song.dim, song.reset));
    }
}
// ─── deck entry point ─────────────────────────────────────────────────────────
function renderRecordDeck(state, renderer, region, now) {
    const song = state.songTheme;
    // Tick platter rotation (only when playing)
    if (state.isPlaying) {
        const period = 1800; // ms per revolution
        state.platterPhase = ((now % period) / period) % 1;
        state.sideWavePhase = ((now % 2400) / 2400) % 1;
    }
    // Outer deck border
    const trkNum = state.currentTrackId
        ? String((0, songTheme_js_1.hashTrackId)(state.currentTrackId) % 1000).padStart(3, "0")
        : "000";
    drawBox(renderer, region, `audio\u00B7vis \u25E6 ${trkNum}`, song.dim, song.reset);
    const inner = {
        x: region.x + 1,
        y: region.y + 1,
        width: region.width - 2,
        height: region.height - 2,
    };
    if (inner.width < 20 || inner.height < 8)
        return;
    // Vertical layout inside the deck
    // nowPlaying=2, gap=1, knobs=1, platter=~38%, midRow=1, albumArt=fill
    const platterH = Math.max(5, Math.floor(inner.height * 0.38));
    const [nowR, , knobsR, platterR, , midR, artR] = (0, tui_js_1.vSplit)(inner, [
        tui_js_1.C.length(2), // now-playing strip
        tui_js_1.C.length(1), // gap
        tui_js_1.C.length(1), // knobs row
        tui_js_1.C.length(platterH), // platter area
        tui_js_1.C.length(1), // gap before mid
        tui_js_1.C.length(1), // mid-divider row
        tui_js_1.C.fill(), // album art (remaining)
    ]);
    renderNowPlaying(state, renderer, nowR);
    renderKnobs(state, renderer, knobsR);
    if (platterR.height >= 5) {
        renderTurntable(state, renderer, platterR);
        renderTonearm(state, renderer, platterR);
    }
    // Mid-divider: progress (left ~52 %) │ grille (right ~48 %)
    if (midR && midR.height > 0) {
        const [progR, sepR, grilleR] = (0, tui_js_1.hSplit)(midR, [
            tui_js_1.C.percent(52),
            tui_js_1.C.length(1),
            tui_js_1.C.fill(),
        ]);
        renderMidProgress(state, renderer, progR);
        if (sepR)
            renderer.write(sepR.x, sepR.y, st("\u2502", song.dim, song.reset));
        renderMidGrille(state, renderer, grilleR, now);
    }
    if (artR && artR.height >= 3) {
        renderAlbumArtScreen(state, renderer, artR);
    }
}
//# sourceMappingURL=recordDeck.js.map
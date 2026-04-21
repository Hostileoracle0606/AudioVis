"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MIN_ROWS = exports.MIN_COLS = void 0;
exports.computeAppLayout = computeAppLayout;
const tui_js_1 = require("../ui/tui.js");
exports.MIN_COLS = 108;
exports.MIN_ROWS = 28;
const TOP_ROW_H = 15;
const BOTTOM_ROW_H = 2;
// Screen region is visually square: terminal cells are ~1:2 (col:row) in
// pixels, so cols ≈ 2 × rows. With TOP_ROW_H=15 − 2 frame borders = 13
// content rows, the matching square width is 26 cols → +2 for left/right
// borders → 28.
const SCREEN_W = 28;
// Pads get a fixed width that snugly holds 4 pads × 8 cols. Everything
// else (the now-playing block) expands with the terminal so it has room
// for the sampler panel on the right.
const PADS_W = 36;
function computeAppLayout(cols, rows) {
    const outer = { x: 0, y: 0, width: cols, height: rows };
    const inner = {
        x: 1, y: 1,
        width: Math.max(0, cols - 2),
        height: Math.max(0, rows - 2),
    };
    const tooSmall = cols < exports.MIN_COLS || rows < exports.MIN_ROWS;
    const [titleBar, sep1R, topRow, sep2R, middleRow, sep3R, bottomRow] = (0, tui_js_1.vSplit)(inner, [
        tui_js_1.C.length(1), tui_js_1.C.length(1), tui_js_1.C.length(TOP_ROW_H), tui_js_1.C.length(1), tui_js_1.C.fill(), tui_js_1.C.length(1), tui_js_1.C.length(BOTTOM_ROW_H),
    ]);
    // Title-bar split: narrower brand + sysLoad bands so the centre band
    // (`searchR` name kept for backwards compatibility — actually holds the
    // hotkey legend now) has room for the full legend.
    const [brandR, searchR, sysLoadR] = (0, tui_js_1.hSplit)(titleBar, [
        tui_js_1.C.length(44), tui_js_1.C.fill(), tui_js_1.C.length(36),
    ]);
    const [screenR, nowR, padsR] = (0, tui_js_1.hSplit)(topRow, [
        tui_js_1.C.length(SCREEN_W), tui_js_1.C.fill(), tui_js_1.C.length(PADS_W),
    ]);
    const [lyricsR, spectrumR] = (0, tui_js_1.hSplit)(middleRow, [
        tui_js_1.C.percent(55), tui_js_1.C.percent(45),
    ]);
    const [scrubR, keysR] = (0, tui_js_1.vSplit)(bottomRow, [tui_js_1.C.length(1), tui_js_1.C.length(1)]);
    const colBreakA = screenR.x + screenR.width;
    const colBreakB = nowR.x + nowR.width;
    const midBreak = lyricsR.x + lyricsR.width;
    return {
        outer, inner,
        titleBar, brandR, searchR, sysLoadR,
        sep1Y: sep1R.y,
        sep1Down: [colBreakA, colBreakB],
        topRow, screenR, nowR, padsR,
        sep2Y: sep2R.y,
        sep2Up: [colBreakA, colBreakB],
        sep2Down: [midBreak],
        middleRow, lyricsR, spectrumR,
        sep3Y: sep3R.y,
        sep3Up: [midBreak],
        bottomRow, scrubR, keysR,
        tooSmall,
    };
}
//# sourceMappingURL=layout.js.map
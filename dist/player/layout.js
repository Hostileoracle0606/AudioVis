"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MIN_ROWS = exports.MIN_COLS = void 0;
exports.computeAppLayout = computeAppLayout;
const tui_js_1 = require("../ui/tui.js");
exports.MIN_COLS = 96;
exports.MIN_ROWS = 24;
const TOP_ROW_H = 10;
const BOTTOM_ROW_H = 2;
function computeAppLayout(cols, rows) {
    const outer = { x: 0, y: 0, width: cols, height: rows };
    const inner = {
        x: 1,
        y: 1,
        width: Math.max(0, cols - 2),
        height: Math.max(0, rows - 2),
    };
    const tooSmall = cols < exports.MIN_COLS || rows < exports.MIN_ROWS;
    const [titleBar, sep1R, topRow, sep2R, middleRow, sep3R, bottomRow] = (0, tui_js_1.vSplit)(inner, [
        tui_js_1.C.length(1),
        tui_js_1.C.length(1),
        tui_js_1.C.length(TOP_ROW_H),
        tui_js_1.C.length(1),
        tui_js_1.C.fill(),
        tui_js_1.C.length(1),
        tui_js_1.C.length(BOTTOM_ROW_H),
    ]);
    const [brandR, searchR, sysLoadR] = (0, tui_js_1.hSplit)(titleBar, [
        tui_js_1.C.length(16), tui_js_1.C.fill(), tui_js_1.C.length(16),
    ]);
    const [artR, nowR, recentR] = (0, tui_js_1.hSplit)(topRow, [
        tui_js_1.C.percent(33), tui_js_1.C.percent(34), tui_js_1.C.percent(33),
    ]);
    const [lyricsR, spectrumR] = (0, tui_js_1.hSplit)(middleRow, [
        tui_js_1.C.percent(50), tui_js_1.C.percent(50),
    ]);
    const [scrubR, keysR] = (0, tui_js_1.vSplit)(bottomRow, [tui_js_1.C.length(1), tui_js_1.C.length(1)]);
    // Junction X coordinates are absolute (0-indexed from outer.x).
    // Each column-break X is where two adjacent regions meet — hSplit returns
    // contiguous regions so artR.x + artR.width == nowR.x.
    const colBreakA = artR.x + artR.width;
    const colBreakB = nowR.x + nowR.width;
    const midBreak = lyricsR.x + lyricsR.width;
    return {
        outer, inner,
        titleBar, brandR, searchR, sysLoadR,
        sep1Y: sep1R.y,
        sep1Down: [colBreakA, colBreakB],
        topRow, artR, nowR, recentR,
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
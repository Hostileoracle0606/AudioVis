"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeLayout = computeLayout;
exports.isTooSmall = isTooSmall;
exports.tooSmallMessage = tooSmallMessage;
const MIN_WIDTH = 60;
const MIN_HEIGHT = 14;
function computeLayout(cols, rows) {
    // Header: 2 lines (title + state)
    // Progress: 1 line
    // Separator: 1 line (blank)
    // Footer: 1 line
    // Remaining rows → visualizer
    const HEADER_H = 2;
    const PROGRESS_H = 1;
    const SEP_H = 1;
    const FOOTER_H = 1;
    const vizTop = HEADER_H + PROGRESS_H + SEP_H;
    const vizHeight = Math.max(1, rows - vizTop - FOOTER_H - 1);
    return {
        header: { x: 0, y: 0, width: cols, height: HEADER_H },
        progress: { x: 0, y: HEADER_H, width: cols, height: PROGRESS_H },
        visualizer: { x: 0, y: vizTop, width: cols, height: vizHeight },
        footer: { x: 0, y: rows - 1, width: cols, height: FOOTER_H },
    };
}
function isTooSmall(cols, rows) {
    return cols < MIN_WIDTH || rows < MIN_HEIGHT;
}
function tooSmallMessage(cols, rows) {
    return `Terminal too small: ${cols}x${rows} (minimum ${MIN_WIDTH}x${MIN_HEIGHT})`;
}
//# sourceMappingURL=layout.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.drawOuterFrame = drawOuterFrame;
exports.drawHSeparator = drawHSeparator;
exports.drawVDivider = drawVDivider;
const TL = "\u256D";
const TR = "\u256E";
const BL = "\u2570";
const BR = "\u256F";
const H = "\u2500";
const V = "\u2502";
const LT = "\u251C";
const RT = "\u2524";
const DT = "\u252C";
const UT = "\u2534";
/** Draw a rounded rectangle around the full renderer bounds. */
function drawOuterFrame(r) {
    const W = r.width, H_ = r.height;
    if (W < 2 || H_ < 2)
        return;
    r.write(0, 0, TL + H.repeat(W - 2) + TR);
    for (let y = 1; y < H_ - 1; y++) {
        r.write(0, y, V);
        r.write(W - 1, y, V);
    }
    r.write(0, H_ - 1, BL + H.repeat(W - 2) + BR);
}
/**
 * Draw a horizontal separator row at `y`, attaching to the outer frame via
 * ├ on the left and ┤ on the right. `junctions.down` = X coords of column
 * dividers that descend below this row (┬). `junctions.up` = X coords of
 * column dividers that ascend from above (┴).
 *
 * Throws if any X coordinate appears in both arrays — that would require ┼,
 * which the palette forbids.
 */
function drawHSeparator(r, y, junctions) {
    const W = r.width;
    if (W < 2)
        return;
    const downSet = new Set(junctions.down);
    const upSet = new Set(junctions.up);
    for (const x of downSet) {
        if (upSet.has(x)) {
            throw new Error(`Cross junction at x=${x} would require ┼, which is forbidden`);
        }
    }
    r.write(0, y, LT);
    for (let x = 1; x < W - 1; x++) {
        let ch = H;
        if (downSet.has(x))
            ch = DT;
        else if (upSet.has(x))
            ch = UT;
        r.write(x, y, ch);
    }
    r.write(W - 1, y, RT);
}
/** Draw a vertical divider │ at column x, from y1 to y2 inclusive. */
function drawVDivider(r, x, y1, y2) {
    for (let y = y1; y <= y2; y++) {
        r.write(x, y, V);
    }
}
//# sourceMappingURL=borders.js.map
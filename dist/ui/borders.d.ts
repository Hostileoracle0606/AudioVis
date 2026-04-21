import type { Renderer } from "./renderer.js";
/** Draw a rounded rectangle around the full renderer bounds. */
export declare function drawOuterFrame(r: Renderer): void;
/**
 * Draw a horizontal separator row at `y`, attaching to the outer frame via
 * ├ on the left and ┤ on the right. `junctions.down` = X coords of column
 * dividers that descend below this row (┬). `junctions.up` = X coords of
 * column dividers that ascend from above (┴).
 *
 * Throws if any X coordinate appears in both arrays — that would require ┼,
 * which the palette forbids.
 */
export declare function drawHSeparator(r: Renderer, y: number, junctions: {
    down: number[];
    up: number[];
}): void;
/** Draw a vertical divider │ at column x, from y1 to y2 inclusive. */
export declare function drawVDivider(r: Renderer, x: number, y1: number, y2: number): void;
//# sourceMappingURL=borders.d.ts.map
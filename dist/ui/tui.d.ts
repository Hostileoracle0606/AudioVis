/**
 * Ratatui-inspired constraint-based layout engine for terminal cells.
 *
 * Usage:
 *   const [searchR, bodyR] = vSplit(frame, [C.length(1), C.fill()]);
 *   const [leftR, rightR] = hSplit(bodyR, [C.percent(50), C.percent(50)]);
 */
import type { Region } from "./layout.js";
export type { Region };
export type Constraint = {
    kind: "length";
    n: number;
} | {
    kind: "percent";
    n: number;
} | {
    kind: "min";
    n: number;
} | {
    kind: "fill";
};
export declare const C: {
    length: (n: number) => Constraint;
    percent: (n: number) => Constraint;
    min: (n: number) => Constraint;
    fill: () => Constraint;
};
/** Split `region` into horizontal strips (top-to-bottom). */
export declare function vSplit(region: Region, cs: Constraint[]): Region[];
/** Split `region` into vertical strips (left-to-right). */
export declare function hSplit(region: Region, cs: Constraint[]): Region[];
//# sourceMappingURL=tui.d.ts.map
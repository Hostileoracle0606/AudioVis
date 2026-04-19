"use strict";
/**
 * Ratatui-inspired constraint-based layout engine for terminal cells.
 *
 * Usage:
 *   const [searchR, bodyR] = vSplit(frame, [C.length(1), C.fill()]);
 *   const [leftR, rightR] = hSplit(bodyR, [C.percent(50), C.percent(50)]);
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.C = void 0;
exports.vSplit = vSplit;
exports.hSplit = hSplit;
exports.C = {
    length: (n) => ({ kind: "length", n }),
    percent: (n) => ({ kind: "percent", n }),
    min: (n) => ({ kind: "min", n }),
    fill: () => ({ kind: "fill" }),
};
/** Split `region` into horizontal strips (top-to-bottom). */
function vSplit(region, cs) {
    const sizes = allocate(region.height, cs);
    const result = [];
    let y = region.y;
    for (const h of sizes) {
        result.push({ x: region.x, y, width: region.width, height: h });
        y += h;
    }
    return result;
}
/** Split `region` into vertical strips (left-to-right). */
function hSplit(region, cs) {
    const sizes = allocate(region.width, cs);
    const result = [];
    let x = region.x;
    for (const w of sizes) {
        result.push({ x, y: region.y, width: w, height: region.height });
        x += w;
    }
    return result;
}
function allocate(total, cs) {
    const sizes = new Array(cs.length).fill(0);
    // Pass 1 — fixed lengths
    for (let i = 0; i < cs.length; i++) {
        if (cs[i].kind === "length") {
            sizes[i] = Math.max(0, cs[i].n);
        }
    }
    // Pass 2 — percentages (of total, not of remaining)
    for (let i = 0; i < cs.length; i++) {
        if (cs[i].kind === "percent") {
            sizes[i] = Math.max(0, Math.round(total * cs[i].n / 100));
        }
    }
    // Remaining after pass 1 + 2
    const assigned = sizes.reduce((a, b) => a + b, 0);
    let remaining = Math.max(0, total - assigned);
    // Pass 3 — fill / min share the rest
    const flexIs = cs
        .map((c, i) => (c.kind === "fill" || c.kind === "min" ? i : -1))
        .filter((i) => i >= 0);
    if (flexIs.length > 0) {
        const share = Math.floor(remaining / flexIs.length);
        for (let j = 0; j < flexIs.length; j++) {
            const i = flexIs[j];
            const c = cs[i];
            // Last flex gets any rounding remainder
            const extra = j === flexIs.length - 1 ? remaining - share * flexIs.length : 0;
            if (c.kind === "min") {
                sizes[i] = Math.max(c.n, share + extra);
            }
            else {
                sizes[i] = share + extra;
            }
        }
    }
    return sizes;
}
//# sourceMappingURL=tui.js.map
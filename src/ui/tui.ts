/**
 * Ratatui-inspired constraint-based layout engine for terminal cells.
 *
 * Usage:
 *   const [searchR, bodyR] = vSplit(frame, [C.length(1), C.fill()]);
 *   const [leftR, rightR] = hSplit(bodyR, [C.percent(50), C.percent(50)]);
 */

import type { Region } from "./layout.js";

// Re-export Region so callers can import everything from one place.
export type { Region };

export type Constraint =
  | { kind: "length";  n: number }   // exactly N cells
  | { kind: "percent"; n: number }   // N% of total dimension
  | { kind: "min";     n: number }   // at least N, absorbs remaining
  | { kind: "fill" };                // absorbs remaining, shared equally

export const C = {
  length:  (n: number): Constraint => ({ kind: "length",  n }),
  percent: (n: number): Constraint => ({ kind: "percent", n }),
  min:     (n: number): Constraint => ({ kind: "min",     n }),
  fill:    ():           Constraint => ({ kind: "fill" }),
};

/** Split `region` into horizontal strips (top-to-bottom). */
export function vSplit(region: Region, cs: Constraint[]): Region[] {
  const sizes = allocate(region.height, cs);
  const result: Region[] = [];
  let y = region.y;
  for (const h of sizes) {
    result.push({ x: region.x, y, width: region.width, height: h });
    y += h;
  }
  return result;
}

/** Split `region` into vertical strips (left-to-right). */
export function hSplit(region: Region, cs: Constraint[]): Region[] {
  const sizes = allocate(region.width, cs);
  const result: Region[] = [];
  let x = region.x;
  for (const w of sizes) {
    result.push({ x, y: region.y, width: w, height: region.height });
    x += w;
  }
  return result;
}

function allocate(total: number, cs: Constraint[]): number[] {
  const sizes = new Array<number>(cs.length).fill(0);

  // Pass 1 — fixed lengths
  for (let i = 0; i < cs.length; i++) {
    if (cs[i].kind === "length") {
      sizes[i] = Math.max(0, (cs[i] as { kind: "length"; n: number }).n);
    }
  }

  // Pass 2 — percentages (of total, not of remaining)
  for (let i = 0; i < cs.length; i++) {
    if (cs[i].kind === "percent") {
      sizes[i] = Math.max(0, Math.round(total * (cs[i] as { kind: "percent"; n: number }).n / 100));
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
        sizes[i] = Math.max((c as { kind: "min"; n: number }).n, share + extra);
      } else {
        sizes[i] = share + extra;
      }
    }
  }

  return sizes;
}

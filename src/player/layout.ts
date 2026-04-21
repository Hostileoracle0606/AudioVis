import { hSplit, vSplit, C } from "../ui/tui.js";
import type { Region } from "../ui/tui.js";

export const MIN_COLS = 96;
export const MIN_ROWS = 24;
const TOP_ROW_H = 10;
const BOTTOM_ROW_H = 2;

export interface AppLayout {
  outer: Region;
  inner: Region;
  titleBar: Region;
  brandR: Region;
  searchR: Region;
  sysLoadR: Region;
  sep1Y: number;
  sep1Down: number[];
  topRow: Region;
  artR: Region;
  nowR: Region;
  recentR: Region;
  sep2Y: number;
  sep2Up: number[];
  sep2Down: number[];
  middleRow: Region;
  lyricsR: Region;
  spectrumR: Region;
  sep3Y: number;
  sep3Up: number[];
  bottomRow: Region;
  scrubR: Region;
  keysR: Region;
  tooSmall: boolean;
}

export function computeAppLayout(cols: number, rows: number): AppLayout {
  const outer: Region = { x: 0, y: 0, width: cols, height: rows };
  const inner: Region = {
    x: 1,
    y: 1,
    width: Math.max(0, cols - 2),
    height: Math.max(0, rows - 2),
  };
  const tooSmall = cols < MIN_COLS || rows < MIN_ROWS;

  const [titleBar, sep1R, topRow, sep2R, middleRow, sep3R, bottomRow] = vSplit(inner, [
    C.length(1),
    C.length(1),
    C.length(TOP_ROW_H),
    C.length(1),
    C.fill(),
    C.length(1),
    C.length(BOTTOM_ROW_H),
  ]);

  const [brandR, searchR, sysLoadR] = hSplit(titleBar, [
    C.length(16), C.fill(), C.length(16),
  ]);

  const [artR, nowR, recentR] = hSplit(topRow, [
    C.percent(33), C.percent(34), C.percent(33),
  ]);

  const [lyricsR, spectrumR] = hSplit(middleRow, [
    C.percent(50), C.percent(50),
  ]);

  const [scrubR, keysR] = vSplit(bottomRow, [C.length(1), C.length(1)]);

  // Junction X coordinates are absolute (0-indexed from outer.x).
  // Each column-break X is where two adjacent regions meet — hSplit returns
  // contiguous regions so artR.x + artR.width == nowR.x.
  const colBreakA = artR.x + artR.width;
  const colBreakB = nowR.x + nowR.width;
  const midBreak  = lyricsR.x + lyricsR.width;

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

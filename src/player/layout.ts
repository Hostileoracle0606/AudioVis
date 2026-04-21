import { hSplit, vSplit, C } from "../ui/tui.js";
import type { Region } from "../ui/tui.js";

export const MIN_COLS = 108;
export const MIN_ROWS = 28;
const TOP_ROW_H = 15;
const BOTTOM_ROW_H = 2;
const NOW_W = 34;
const PADS_W = 34;

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
  screenR: Region;
  nowR: Region;
  padsR: Region;
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
    x: 1, y: 1,
    width: Math.max(0, cols - 2),
    height: Math.max(0, rows - 2),
  };
  const tooSmall = cols < MIN_COLS || rows < MIN_ROWS;

  const [titleBar, sep1R, topRow, sep2R, middleRow, sep3R, bottomRow] = vSplit(inner, [
    C.length(1), C.length(1), C.length(TOP_ROW_H), C.length(1), C.fill(), C.length(1), C.length(BOTTOM_ROW_H),
  ]);

  const [brandR, searchR, sysLoadR] = hSplit(titleBar, [
    C.length(50), C.fill(), C.length(44),
  ]);

  const [screenR, nowR, padsR] = hSplit(topRow, [
    C.fill(), C.length(NOW_W), C.length(PADS_W),
  ]);

  const [lyricsR, spectrumR] = hSplit(middleRow, [
    C.percent(55), C.percent(45),
  ]);

  const [scrubR, keysR] = vSplit(bottomRow, [C.length(1), C.length(1)]);

  const colBreakA = screenR.x + screenR.width;
  const colBreakB = nowR.x + nowR.width;
  const midBreak  = lyricsR.x + lyricsR.width;

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

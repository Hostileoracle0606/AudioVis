// src/album/converter.ts
import Jimp from "jimp";
import { ansilize, ansilizeMono, ansilizeQuadrant } from "./ansilize.js";

export interface AsciiArt {
  trackId: string;
  /** 2 rows × 4 cols thumbnail for the header icon. */
  thumbnail: string[];
  /** Fullscreen album-art-mode lines (ANSI truecolor half-blocks). */
  lines: string[];
  fullCols: number;
  fullRows: number;
  /** Player-mode screen-panel lines at a smaller target size. */
  playerLines: string[];
  playerCols: number;
  playerRows: number;
  /** Terminal dimensions at conversion time — stale-check on resize. */
  cols: number;
  rows: number;
  /** 4×4 binary perceptual hash for queue pad icons (16 bytes, each 0 or 1). */
  padFingerprint: Uint8Array;
}

function computePadFingerprint(img: Jimp): Uint8Array {
  const small = img.clone().resize(4, 4);
  const out = new Uint8Array(16);
  let totalLuma = 0;
  const luma: number[] = [];
  small.scan(0, 0, 4, 4, function(this: Jimp, _x: number, _y: number, idx: number) {
    const rr = this.bitmap.data[idx];
    const gg = this.bitmap.data[idx + 1];
    const bb = this.bitmap.data[idx + 2];
    const y = 0.299 * rr + 0.587 * gg + 0.114 * bb;
    luma.push(y);
    totalLuma += y;
  });
  const mean = totalLuma / 16;
  for (let i = 0; i < 16; i++) out[i] = luma[i] >= mean ? 1 : 0;
  return out;
}

function renderAt(img: Jimp, cols: number, rows: number, noColor: boolean): string[] {
  if (cols <= 0 || rows <= 0) return [];
  return noColor ? ansilizeMono(img, cols, rows) : ansilize(img, cols, rows);
}

function renderAtHiRes(img: Jimp, cols: number, rows: number, noColor: boolean): string[] {
  if (cols <= 0 || rows <= 0) return [];
  // Quadrant blocks double horizontal resolution. Fall back to mono ramp
  // in --no-color mode since 2-colour-per-cell doesn't apply there.
  return noColor ? ansilizeMono(img, cols, rows) : ansilizeQuadrant(img, cols, rows);
}

/**
 * Convert a raw image buffer to an AsciiArt object, using the ansilize
 * half-block truecolor renderer.  Produces two renderings:
 *   - `lines` at album-art-mode size (~48% of viz width)
 *   - `playerLines` at player-mode screen-panel size
 */
export async function convertToAscii(
  buffer: Buffer,
  trackId: string,
  vizCols: number,
  vizRows: number,
  noColor: boolean,
  targetCols?: number,
  targetRows?: number,
): Promise<AsciiArt> {
  const img = await Jimp.read(buffer);

  // When the caller supplies target dimensions, use them verbatim so the
  // art fills the widget's interior exactly. Otherwise fall back to the
  // legacy size heuristics.
  let fullCols: number, fullRows: number;
  if (targetCols && targetRows) {
    fullCols = Math.max(1, targetCols);
    fullRows = Math.max(1, targetRows);
  } else {
    const fullCols0 = Math.max(1, Math.floor(vizCols * 0.48));
    fullRows = Math.max(1, Math.min(vizRows - 2, Math.floor(fullCols0 / 2.2)));
    fullCols = Math.max(1, Math.floor(fullRows * 2.2));
  }

  const playerCols = fullCols;
  const playerRows = fullRows;

  // Player mode: quadrant blocks (2× horizontal pixel density). Fullscreen
  // album-art mode keeps the half-block renderer — simpler output that
  // lets the user see the full image without chrome.
  const lines = renderAtHiRes(img, fullCols, fullRows, noColor);
  const playerLines = lines;
  const thumb = renderAt(img, 4, 2, noColor);
  const padFingerprint = computePadFingerprint(img);

  return {
    trackId,
    thumbnail: thumb,
    lines,
    fullCols,
    fullRows,
    playerLines,
    playerCols,
    playerRows,
    cols: vizCols,
    rows: vizRows,
    padFingerprint,
  };
}

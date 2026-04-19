// src/album/converter.ts
import Jimp from "jimp";
import { ansilize, ansilizeMono } from "./ansilize.js";

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
}

function renderAt(img: Jimp, cols: number, rows: number, noColor: boolean): string[] {
  if (cols <= 0 || rows <= 0) return [];
  return noColor ? ansilizeMono(img, cols, rows) : ansilize(img, cols, rows);
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
  noColor: boolean
): Promise<AsciiArt> {
  const img = await Jimp.read(buffer);

  // Fullscreen album-art mode: ~48% viz width, aspect-corrected.
  const fullCols0 = Math.max(1, Math.floor(vizCols * 0.48));
  const fullRows = Math.max(1, Math.min(vizRows - 2, Math.floor(fullCols0 / 2.2)));
  const fullCols = Math.max(1, Math.floor(fullRows * 2.2));

  // Player mode screen panel: roughly the screen sub-panel dimensions.
  // Chassis is ~58% of viz width, screen is ~58% of chassis interior → ~32%.
  // Height: roughly 8-10 rows (see renderChassis).
  const playerCols = Math.max(4, Math.min(40, Math.floor(vizCols * 0.28)));
  const playerRows = Math.max(3, Math.min(12, Math.floor(playerCols / 2.6)));

  const lines = renderAt(img, fullCols, fullRows, noColor);
  const playerLines = renderAt(img, playerCols, playerRows, noColor);
  const thumb = renderAt(img, 4, 2, noColor);

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
  };
}

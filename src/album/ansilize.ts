/**
 * Truecolor half-block image → ANSI renderer.
 *
 * Inspired by the Go project `ansizalizer` (github.com/Zebbeni/ansizalizer)
 * and its rendering library `ansipx`.  Since those are Go packages and can't
 * be imported from Node, we re-implement the same visual approach here:
 *
 *   - Each terminal cell represents TWO vertical pixels.
 *   - The upper half-block glyph `▀` is drawn with foreground = upper pixel
 *     colour and background = lower pixel colour.  Result: 2× vertical
 *     resolution vs. one-char-one-pixel, with full 24-bit RGB from both pixels.
 *
 * Character dimensions in a terminal are roughly 1 col × 2 rows in pixel
 * aspect, so sampling 2 vertical image pixels per cell undoes that stretch
 * and gives near-correct aspect ratio.
 */
import Jimp from "jimp";

const HALF_BLOCK = "\u2580"; // ▀

/**
 * Render a Jimp image to an array of ANSI-escape-laden strings, one per row.
 *
 * @param img     Jimp image (already decoded).  Not mutated.
 * @param cols    Target width in terminal cells.
 * @param rows    Target height in terminal cells (each cell = 2 image pixels).
 */
export function ansilize(img: Jimp, cols: number, rows: number): string[] {
  if (cols <= 0 || rows <= 0) return [];

  // Resize to cols × (rows * 2) pixels — 2 vertical pixels per cell.
  const resized = img.clone().resize(cols, rows * 2);
  const W = resized.bitmap.width;
  const H = resized.bitmap.height;

  const lines: string[] = [];
  let prevFg = -1;
  let prevBg = -1;

  for (let cellRow = 0; cellRow < rows; cellRow++) {
    const yTop = cellRow * 2;
    const yBot = Math.min(H - 1, yTop + 1);
    let line = "";
    prevFg = -1;
    prevBg = -1;

    for (let col = 0; col < W; col++) {
      const top = resized.getPixelColor(col, yTop);
      const bot = resized.getPixelColor(col, yBot);
      const rT = (top >>> 24) & 0xff;
      const gT = (top >>> 16) & 0xff;
      const bT = (top >>>  8) & 0xff;
      const rB = (bot >>> 24) & 0xff;
      const gB = (bot >>> 16) & 0xff;
      const bB = (bot >>>  8) & 0xff;

      // Pack 24-bit colours as ints so we can skip redundant SGR changes.
      const fg = (rT << 16) | (gT << 8) | bT;
      const bg = (rB << 16) | (gB << 8) | bB;

      if (fg !== prevFg || bg !== prevBg) {
        // SGR: 38;2;r;g;b for 24-bit fg, 48;2;r;g;b for 24-bit bg.
        line += `\x1b[38;2;${rT};${gT};${bT};48;2;${rB};${gB};${bB}m`;
        prevFg = fg;
        prevBg = bg;
      }
      line += HALF_BLOCK;
    }
    line += "\x1b[0m";
    lines.push(line);
  }

  return lines;
}

/**
 * Degraded monochrome fallback: luminance → ASCII density ramp.
 * Used when colour is disabled (--no-color).
 */
const PALETTE = " .,:;+*#%@\u2588";

export function ansilizeMono(img: Jimp, cols: number, rows: number): string[] {
  if (cols <= 0 || rows <= 0) return [];
  const resized = img.clone().resize(cols, rows);
  const lines: string[] = [];
  for (let row = 0; row < rows; row++) {
    let line = "";
    for (let col = 0; col < cols; col++) {
      const px = resized.getPixelColor(col, row);
      const r = (px >>> 24) & 0xff;
      const g = (px >>> 16) & 0xff;
      const b = (px >>>  8) & 0xff;
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const idx = Math.min(PALETTE.length - 1, Math.floor(lum * PALETTE.length));
      line += PALETTE[idx];
    }
    lines.push(line);
  }
  return lines;
}

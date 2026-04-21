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

// Quadrant-block glyph table, indexed by a 4-bit mask
// (bit 0 = top-left, 1 = top-right, 2 = bottom-left, 3 = bottom-right).
// A "1" bit means that sub-pixel belongs to the fg (brighter) cluster.
const QUAD_CHARS: readonly string[] = [
  " ",        // 0000
  "\u2598",   // 0001 ▘ TL
  "\u259D",   // 0010 ▝ TR
  "\u2580",   // 0011 ▀ TL+TR
  "\u2596",   // 0100 ▖ BL
  "\u258C",   // 0101 ▌ TL+BL
  "\u259E",   // 0110 ▞ TR+BL
  "\u259B",   // 0111 ▛ TL+TR+BL
  "\u2597",   // 1000 ▗ BR
  "\u259A",   // 1001 ▚ TL+BR
  "\u2590",   // 1010 ▐ TR+BR
  "\u259C",   // 1011 ▜ TL+TR+BR
  "\u2584",   // 1100 ▄ BL+BR
  "\u2599",   // 1101 ▙ TL+BL+BR
  "\u259F",   // 1110 ▟ TR+BL+BR
  "\u2588",   // 1111 █ all
];

/**
 * Truecolor quadrant-block renderer. Each terminal cell encodes 2×2
 * image sub-pixels (vs. 1×2 for `ansilize`), doubling horizontal
 * resolution. Since a cell has only one fg + one bg colour, the 4
 * sub-pixels are split into a fg cluster (brighter than cell mean)
 * and a bg cluster (darker), then averaged to produce the two SGR
 * colours. The quadrant glyph picks which positions belong to fg.
 */
export function ansilizeQuadrant(img: Jimp, cols: number, rows: number): string[] {
  if (cols <= 0 || rows <= 0) return [];
  // 2× vertical AND 2× horizontal pixels per cell.
  const resized = img.clone().resize(cols * 2, rows * 2);
  const W = resized.bitmap.width;
  const H = resized.bitmap.height;
  const lines: string[] = [];

  for (let row = 0; row < rows; row++) {
    const y0 = row * 2;
    const y1 = Math.min(H - 1, y0 + 1);
    let line = "";
    let prevFg = -1;
    let prevBg = -1;

    for (let col = 0; col < cols; col++) {
      const x0 = col * 2;
      const x1 = Math.min(W - 1, x0 + 1);
      const samples: { r: number; g: number; b: number; lum: number }[] = [
        pixel(resized, x0, y0),
        pixel(resized, x1, y0),
        pixel(resized, x0, y1),
        pixel(resized, x1, y1),
      ];

      // Split sub-pixels by luminance around the local mean.
      const meanLum = (samples[0].lum + samples[1].lum + samples[2].lum + samples[3].lum) / 4;
      let mask = 0;
      const fg = { r: 0, g: 0, b: 0, n: 0 };
      const bg = { r: 0, g: 0, b: 0, n: 0 };
      for (let i = 0; i < 4; i++) {
        const s = samples[i];
        if (s.lum > meanLum) {
          mask |= 1 << i;
          fg.r += s.r; fg.g += s.g; fg.b += s.b; fg.n++;
        } else {
          bg.r += s.r; bg.g += s.g; bg.b += s.b; bg.n++;
        }
      }
      // Degenerate cases (all same luma) → collapse to single colour.
      if (fg.n === 0) { fg.r = bg.r; fg.g = bg.g; fg.b = bg.b; fg.n = bg.n; }
      if (bg.n === 0) { bg.r = fg.r; bg.g = fg.g; bg.b = fg.b; bg.n = fg.n; }
      const fgR = Math.round(fg.r / fg.n), fgG = Math.round(fg.g / fg.n), fgB = Math.round(fg.b / fg.n);
      const bgR = Math.round(bg.r / bg.n), bgG = Math.round(bg.g / bg.n), bgB = Math.round(bg.b / bg.n);

      const fgKey = (fgR << 16) | (fgG << 8) | fgB;
      const bgKey = (bgR << 16) | (bgG << 8) | bgB;
      if (fgKey !== prevFg || bgKey !== prevBg) {
        line += `\x1b[38;2;${fgR};${fgG};${fgB};48;2;${bgR};${bgG};${bgB}m`;
        prevFg = fgKey;
        prevBg = bgKey;
      }
      line += QUAD_CHARS[mask];
    }
    line += "\x1b[0m";
    lines.push(line);
  }
  return lines;
}

function pixel(img: Jimp, x: number, y: number): { r: number; g: number; b: number; lum: number } {
  const px = img.getPixelColor(x, y);
  const r = (px >>> 24) & 0xff;
  const g = (px >>> 16) & 0xff;
  const b = (px >>>  8) & 0xff;
  return { r, g, b, lum: 0.299 * r + 0.587 * g + 0.114 * b };
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

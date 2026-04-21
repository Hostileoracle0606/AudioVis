export const GLYPH_H = 8;
export const GLYPH_W = 6;

// Lightweight 8x6 block font. Covers A-Z 0-9 and common punctuation.
// Missing chars render as all-space (caller can detect via GLYPHS[ch] !== undefined).
export const GLYPHS: Record<string, string[]> = {
  " ": ["      ","      ","      ","      ","      ","      ","      ","      "],
  "A": ["  ██  ","  ██  "," ████ "," █  █ ","██████","██  ██","██  ██","      "],
  "B": ["█████ ","██  ██","██  ██","█████ ","██  ██","██  ██","█████ ","      "],
  "C": [" ████ ","██  ██","██    ","██    ","██    ","██  ██"," ████ ","      "],
  "D": ["████  ","██ ██ ","██  ██","██  ██","██  ██","██ ██ ","████  ","      "],
  "E": ["██████","██    ","██    ","█████ ","██    ","██    ","██████","      "],
  "F": ["██████","██    ","██    ","█████ ","██    ","██    ","██    ","      "],
  "G": [" ████ ","██  ██","██    ","██ ███","██  ██","██  ██"," ████ ","      "],
  "H": ["██  ██","██  ██","██  ██","██████","██  ██","██  ██","██  ██","      "],
  "I": [" ████ ","  ██  ","  ██  ","  ██  ","  ██  ","  ██  "," ████ ","      "],
  "J": ["   ███","    ██","    ██","    ██","    ██","██  ██"," ████ ","      "],
  "K": ["██  ██","██ ██ ","████  ","███   ","████  ","██ ██ ","██  ██","      "],
  "L": ["██    ","██    ","██    ","██    ","██    ","██    ","██████","      "],
  "M": ["██  ██","██████","██████","██████","██  ██","██  ██","██  ██","      "],
  "N": ["██  ██","███ ██","████ █","██ █ █","██  ██","██  ██","██  ██","      "],
  "O": [" ████ ","██  ██","██  ██","██  ██","██  ██","██  ██"," ████ ","      "],
  "P": ["█████ ","██  ██","██  ██","█████ ","██    ","██    ","██    ","      "],
  "Q": [" ████ ","██  ██","██  ██","██  ██","██ ███","██  ██"," █████","      "],
  "R": ["█████ ","██  ██","██  ██","█████ ","████  ","██ ██ ","██  ██","      "],
  "S": [" █████","██    ","██    "," ████ ","    ██","    ██","█████ ","      "],
  "T": ["██████","  ██  ","  ██  ","  ██  ","  ██  ","  ██  ","  ██  ","      "],
  "U": ["██  ██","██  ██","██  ██","██  ██","██  ██","██  ██"," ████ ","      "],
  "V": ["██  ██","██  ██","██  ██","██  ██","██  ██"," ████ ","  ██  ","      "],
  "W": ["██  ██","██  ██","██  ██","██████","██████","██████","██  ██","      "],
  "X": ["██  ██","██  ██"," ████ ","  ██  "," ████ ","██  ██","██  ██","      "],
  "Y": ["██  ██","██  ██"," ████ ","  ██  ","  ██  ","  ██  ","  ██  ","      "],
  "Z": ["██████","    ██","   ██ ","  ██  "," ██   ","██    ","██████","      "],
  "0": [" ████ ","██  ██","██ ███","██████","███ ██","██  ██"," ████ ","      "],
  "1": ["  ██  "," ███  ","  ██  ","  ██  ","  ██  ","  ██  "," █████","      "],
  "2": [" ████ ","██  ██","    ██","  ███ "," ██   ","██    ","██████","      "],
  "3": [" ████ ","██  ██","    ██","  ███ ","    ██","██  ██"," ████ ","      "],
  "4": ["   ███","  ████"," ██ ██","██  ██","██████","    ██","    ██","      "],
  "5": ["██████","██    ","██    ","█████ ","    ██","██  ██"," ████ ","      "],
  "6": [" ████ ","██    ","██    ","█████ ","██  ██","██  ██"," ████ ","      "],
  "7": ["██████","    ██","   ██ ","  ██  "," ██   ","██    ","██    ","      "],
  "8": [" ████ ","██  ██","██  ██"," ████ ","██  ██","██  ██"," ████ ","      "],
  "9": [" ████ ","██  ██","██  ██"," █████","    ██","    ██"," ████ ","      "],
  ".": ["      ","      ","      ","      ","      ","  ██  ","  ██  ","      "],
  ",": ["      ","      ","      ","      ","      ","  ██  ","  ██  "," ██   "],
  "!": ["  ██  ","  ██  ","  ██  ","  ██  ","      ","  ██  ","  ██  ","      "],
  "?": [" ████ ","██  ██","    ██","   ██ ","  ██  ","      ","  ██  ","      "],
  "'": ["  ██  ","  ██  ","      ","      ","      ","      ","      ","      "],
  // Dollar sign — S curve with a vertical bar through it; common in
  // artist names (A$AP Rocky, Ke$ha, etc.).
  "$": ["  ██  "," █████","██ █  "," ████ ","   █ █","█████ ","  ██  ","      "],
  "&": [" ███  ","█   █ ","█   █ "," ███  ","█ ██ █","█  █ █"," ███ █","      "],
  "-": ["      ","      ","      "," ████ ","      ","      ","      ","      "],
  "+": ["      ","  ██  ","  ██  ","██████","  ██  ","  ██  ","      ","      "],
  "/": ["     █","    ██","   ██ ","  ██  "," ██   ","██    ","█     ","      "],
  "(": ["   ██ ","  ██  "," ██   "," ██   "," ██   ","  ██  ","   ██ ","      "],
  ")": [" ██   ","  ██  ","   ██ ","   ██ ","   ██ ","  ██  "," ██   ","      "],
  ":": ["      ","      ","  ██  ","      ","      ","  ██  ","      ","      "],
};

/**
 * Render a string as an array of `GLYPH_H` lines using the block font.
 * Unknown characters produce a blank (all-space) glyph column.
 * Glyphs are separated by one blank column.
 */
export function renderBigLine(text: string): string[] {
  const upper = text.toUpperCase();
  const lines: string[] = new Array(GLYPH_H).fill("");
  for (let i = 0; i < upper.length; i++) {
    const ch = upper[i];
    const glyph = GLYPHS[ch] ?? GLYPHS[" "];
    for (let r = 0; r < GLYPH_H; r++) {
      lines[r] += glyph[r];
      if (i < upper.length - 1) lines[r] += " ";
    }
  }
  return lines;
}

/**
 * Render the same glyph set but at a reduced vertical resolution, yielding
 * 3 terminal rows of half-block output (vs. 4 from `renderBigLine` +
 * `compressToHalfBlock`). Used for marquee-style "smaller billboard"
 * lettering where 4 rows is too tall.
 */
export function renderMiniLine(text: string): string[] {
  const full = renderBigLine(text); // 8 pixel rows × N cols
  // Drop the bottom padding row to get 7 rows; we want 6 for a clean
  // half-block compress to 3 terminal rows, so also drop row 1 (a
  // duplicate of row 0 in most glyphs) to keep the letterform intact.
  const reduced = [full[0], full[2], full[3], full[4], full[5], full[6]];
  return compressToHalfBlock(reduced); // 3 rows
}

/**
 * Render the GLYPHS at half horizontal resolution: pairs of glyph columns
 * collapse into one via "any-lit" union, so a 6-wide glyph becomes
 * 3-wide. Combined with row-4 sub-sampling and half-block vertical
 * compression, each character fits in 2 terminal rows × 3 cols + 1
 * separator = 4 cols. Used as the next-smaller fallback when
 * `renderMiniLine` overflows the available width.
 */
export function renderTinyLine(text: string): string[] {
  const upper = text.toUpperCase();
  // Build 7 narrowed pixel rows: for each glyph, OR-pair its cols 0|1, 2|3, 4|5
  // to yield 3 cols; join glyphs with a single-space separator.
  const rows: string[] = new Array(7).fill("");
  for (let i = 0; i < upper.length; i++) {
    const ch = upper[i];
    const glyph = GLYPHS[ch] ?? GLYPHS[" "];
    for (let r = 0; r < 7; r++) {
      const src = glyph[r];
      const c0 = (src[0] !== " " || src[1] !== " ") ? "\u2588" : " ";
      const c1 = (src[2] !== " " || src[3] !== " ") ? "\u2588" : " ";
      const c2 = (src[4] !== " " || src[5] !== " ") ? "\u2588" : " ";
      rows[r] += c0 + c1 + c2;
      if (i < upper.length - 1) rows[r] += " ";
    }
  }
  // Sample rows 0, 2, 4, 6 and half-block-compress to 2 terminal rows.
  return compressToHalfBlock([rows[0], rows[2], rows[4], rows[6]]);
}

/**
 * Pack every 2 rows of input into 1 row of output using half-block glyphs.
 * Treats any non-space character as "on". Output uses only:
 *   ▀ (top half)   ▄ (bottom half)   █ (both)   space (neither)
 * If input has an odd number of rows, the last row is treated as a top
 * half with an empty bottom.
 */
export function compressToHalfBlock(rows: string[]): string[] {
  const out: string[] = [];
  const width = rows.length > 0 ? rows[0].length : 0;
  for (let r = 0; r < rows.length; r += 2) {
    const top = rows[r] ?? "";
    const bot = rows[r + 1] ?? "";
    let line = "";
    for (let c = 0; c < width; c++) {
      const t = (top[c] ?? " ") !== " ";
      const b = (bot[c] ?? " ") !== " ";
      line += t && b ? "\u2588" : t ? "\u2580" : b ? "\u2584" : " ";
    }
    out.push(line);
  }
  return out;
}

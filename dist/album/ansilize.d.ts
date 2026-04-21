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
/**
 * Render a Jimp image to an array of ANSI-escape-laden strings, one per row.
 *
 * @param img     Jimp image (already decoded).  Not mutated.
 * @param cols    Target width in terminal cells.
 * @param rows    Target height in terminal cells (each cell = 2 image pixels).
 */
export declare function ansilize(img: Jimp, cols: number, rows: number): string[];
/**
 * Truecolor quadrant-block renderer. Each terminal cell encodes 2×2
 * image sub-pixels (vs. 1×2 for `ansilize`), doubling horizontal
 * resolution. Since a cell has only one fg + one bg colour, the 4
 * sub-pixels are split into a fg cluster (brighter than cell mean)
 * and a bg cluster (darker), then averaged to produce the two SGR
 * colours. The quadrant glyph picks which positions belong to fg.
 */
export declare function ansilizeQuadrant(img: Jimp, cols: number, rows: number): string[];
export declare function ansilizeMono(img: Jimp, cols: number, rows: number): string[];
//# sourceMappingURL=ansilize.d.ts.map
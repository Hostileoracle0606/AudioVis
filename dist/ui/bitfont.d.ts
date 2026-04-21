export declare const GLYPH_H = 8;
export declare const GLYPH_W = 6;
export declare const GLYPHS: Record<string, string[]>;
/**
 * Render a string as an array of `GLYPH_H` lines using the block font.
 * Unknown characters produce a blank (all-space) glyph column.
 * Glyphs are separated by one blank column.
 */
export declare function renderBigLine(text: string): string[];
/**
 * Render the same glyph set but at a reduced vertical resolution, yielding
 * 3 terminal rows of half-block output (vs. 4 from `renderBigLine` +
 * `compressToHalfBlock`). Used for marquee-style "smaller billboard"
 * lettering where 4 rows is too tall.
 */
export declare function renderMiniLine(text: string): string[];
/**
 * Render the GLYPHS at half horizontal resolution: pairs of glyph columns
 * collapse into one via "any-lit" union, so a 6-wide glyph becomes
 * 3-wide. Combined with row-4 sub-sampling and half-block vertical
 * compression, each character fits in 2 terminal rows × 3 cols + 1
 * separator = 4 cols. Used as the next-smaller fallback when
 * `renderMiniLine` overflows the available width.
 */
export declare function renderTinyLine(text: string): string[];
/**
 * Pack every 2 rows of input into 1 row of output using half-block glyphs.
 * Treats any non-space character as "on". Output uses only:
 *   ▀ (top half)   ▄ (bottom half)   █ (both)   space (neither)
 * If input has an odd number of rows, the last row is treated as a top
 * half with an empty bottom.
 */
export declare function compressToHalfBlock(rows: string[]): string[];
//# sourceMappingURL=bitfont.d.ts.map
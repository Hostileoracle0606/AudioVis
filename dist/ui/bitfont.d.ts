export declare const GLYPH_H = 8;
export declare const GLYPH_W = 6;
export declare const GLYPHS: Record<string, string[]>;
/**
 * Render a string as an array of `GLYPH_H` lines using the block font.
 * Unknown characters produce a blank (all-space) glyph column.
 * Glyphs are separated by one blank column.
 */
export declare function renderBigLine(text: string): string[];
//# sourceMappingURL=bitfont.d.ts.map
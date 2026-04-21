import type { Renderer } from "../../ui/renderer.js";
import type { Region } from "../../ui/tui.js";
import type { Theme } from "../theme.js";
export interface BigLyricProps {
    text: string;
    bright: boolean;
}
/**
 * Word-wrap `text` to fit within `maxChars` per line. Whitespace is collapsed
 * to single spaces. Words longer than `maxChars` are hard-broken so no
 * content is silently dropped.
 */
export declare function wrapLyric(text: string, maxChars: number): string[];
/**
 * Render the active lyric in half-block-compressed bitfont, word-wrapped
 * to fit inside `region`. Each wrapped line occupies 4 terminal rows.
 * The block is vertically centered; a leading ● marker sits one col in
 * from region.x, aligned with the first line's middle row. If there are
 * more wrapped lines than vertical space permits, the last visible line
 * is marked with a trailing "…" glyph.
 */
export declare function renderBigLyric(r: Renderer, region: Region, props: BigLyricProps, theme: Theme): void;
//# sourceMappingURL=bigLyric.d.ts.map
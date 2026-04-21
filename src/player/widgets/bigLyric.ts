import type { Renderer } from "../../ui/renderer.js";
import type { Region } from "../../ui/tui.js";
import type { Theme } from "../theme.js";
import { renderBigLine, compressToHalfBlock, GLYPH_W } from "../../ui/bitfont.js";

export interface BigLyricProps {
  text: string;
  bright: boolean;
}

const BIG_ROWS_PER_LINE = 4; // compressed half-block output is 4 terminal rows tall

/**
 * Word-wrap `text` to fit within `maxChars` per line. Whitespace is collapsed
 * to single spaces. Words longer than `maxChars` are hard-broken so no
 * content is silently dropped.
 */
export function wrapLyric(text: string, maxChars: number): string[] {
  if (maxChars <= 0) return [];
  const words = text.trim().split(/\s+/).filter((w) => w.length > 0);
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    if (w.length > maxChars) {
      if (cur) { out.push(cur); cur = ""; }
      for (let i = 0; i < w.length; i += maxChars) {
        const chunk = w.slice(i, i + maxChars);
        if (i + maxChars >= w.length) cur = chunk;
        else out.push(chunk);
      }
      continue;
    }
    const next = cur ? `${cur} ${w}` : w;
    if (next.length <= maxChars) cur = next;
    else { if (cur) out.push(cur); cur = w; }
  }
  if (cur) out.push(cur);
  return out;
}

/**
 * Render the active lyric in half-block-compressed bitfont, word-wrapped
 * to fit inside `region`. Each wrapped line occupies 4 terminal rows.
 * The block is vertically centered; a leading ● marker sits one col in
 * from region.x, aligned with the first line's middle row. If there are
 * more wrapped lines than vertical space permits, the last visible line
 * is marked with a trailing "…" glyph.
 */
export function renderBigLyric(
  r: Renderer,
  region: Region,
  props: BigLyricProps,
  theme: Theme,
): void {
  if (region.width < 8 || region.height < BIG_ROWS_PER_LINE) return;

  const color = props.bright ? theme.accentBright : theme.accent;
  const markerCol = region.x + 1;
  const textStartCol = region.x + 3;
  const textMaxWidth = Math.max(0, region.width - 4);

  const maxChars = Math.max(0, Math.floor((textMaxWidth + 1) / (GLYPH_W + 1)));
  if (maxChars === 0) return;

  const maxLines = Math.max(1, Math.floor(region.height / BIG_ROWS_PER_LINE));
  let wrapped = wrapLyric(props.text, maxChars);
  if (wrapped.length === 0) return;

  let truncated = false;
  if (wrapped.length > maxLines) {
    wrapped = wrapped.slice(0, maxLines);
    truncated = true;
  }
  if (truncated) {
    const last = wrapped[wrapped.length - 1];
    const tailWithEllipsis = (last.length + 1 <= maxChars ? last : last.slice(0, Math.max(0, maxChars - 1))) + ".";
    wrapped[wrapped.length - 1] = tailWithEllipsis;
  }

  const totalRows = wrapped.length * BIG_ROWS_PER_LINE;
  const startY = region.y + Math.max(0, Math.floor((region.height - totalRows) / 2));

  for (let li = 0; li < wrapped.length; li++) {
    const lineText = wrapped[li];
    const pixelRows = renderBigLine(lineText);
    const compressed = compressToHalfBlock(pixelRows);
    for (let i = 0; i < compressed.length && i < BIG_ROWS_PER_LINE; i++) {
      let line = compressed[i];
      if (line.length > textMaxWidth) line = line.slice(0, textMaxWidth);
      r.write(textStartCol, startY + li * BIG_ROWS_PER_LINE + i, `${color}${line}${theme.reset}`);
    }
  }

  const markerRow = startY + Math.floor((BIG_ROWS_PER_LINE - 1) / 2);
  r.write(markerCol, markerRow, `${color}\u25CF${theme.reset}`);
}

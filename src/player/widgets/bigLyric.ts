import type { Renderer } from "../../ui/renderer.js";
import type { Region } from "../../ui/tui.js";
import type { Theme } from "../theme.js";
import { renderBigLine, compressToHalfBlock } from "../../ui/bitfont.js";

export interface BigLyricProps {
  text: string;
  bright: boolean;
}

/**
 * Render the active lyric in half-block-compressed bitfont.
 * Occupies rows region.y+1 … region.y+4 (4 rows).
 * Region row 0 is reserved for the panel's context (caller draws).
 * Clips text to region.width; long lyrics are truncated.
 * Leading ● marker is drawn at region.x on the middle compressed row.
 */
export function renderBigLyric(
  r: Renderer,
  region: Region,
  props: BigLyricProps,
  theme: Theme,
): void {
  if (region.width < 8 || region.height < 4) return;

  const color = props.bright ? theme.accentBright : theme.accent;
  const markerCol = region.x + 1;
  const textStartCol = region.x + 3;
  const textMaxWidth = Math.max(0, region.width - 4);

  const pixelRows = renderBigLine(props.text);
  const compressed = compressToHalfBlock(pixelRows);

  const rows = Math.min(compressed.length, region.height - 1);
  for (let i = 0; i < rows; i++) {
    let line = compressed[i];
    if (line.length > textMaxWidth) line = line.slice(0, textMaxWidth);
    r.write(textStartCol, region.y + 1 + i, `${color}${line}${theme.reset}`);
  }

  const midRow = region.y + 1 + Math.floor((rows - 1) / 2);
  r.write(markerCol, midRow, `${color}\u25CF${theme.reset}`);
}

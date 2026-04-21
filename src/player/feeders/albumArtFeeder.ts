import { fetchImageBuffer } from "../../album/fetcher.js";
import { convertToAscii } from "../../album/converter.js";
import { getCached, setCached } from "../../album/cache.js";
import type { AppState } from "../state.js";

export async function fetchAlbumArt(
  state: AppState,
  url: string,
  cellCols: number,
  cellRows: number,
  noColor: boolean,
): Promise<void> {
  if (!url) { state.albumArt = null; return; }
  const cacheKey = `${url}::${cellCols}x${cellRows}::${noColor ? "mono" : "color"}`;
  const cached = getCached(cacheKey);
  if (cached) { state.albumArt = cached; return; }
  try {
    const buf = await fetchImageBuffer(url);
    const art = await convertToAscii(buf, cacheKey, cellCols * 2, cellRows * 2, noColor);
    setCached(cacheKey, art);
    state.albumArt = art;
    state.padFingerprints[0] = art.padFingerprint;
    state.activePadIndex = 0;
  } catch {
    state.albumArt = null;
  }
}

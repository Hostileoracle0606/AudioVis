import { fetchLyrics, activeLyricIndex } from "../../lyrics/lrclib.js";
import type { AppState, LrcLine } from "../state.js";

const cache = new Map<string, LrcLine[]>();

export async function fetchLyricsFor(
  state: AppState,
  title: string,
  artist: string,
  album: string,
): Promise<void> {
  const key = `${artist}::${title}::${album}`;
  if (cache.has(key)) {
    state.lyrics = cache.get(key)!;
    state.activeLyricIndex = -1;
    return;
  }
  try {
    const raw = await fetchLyrics(title, artist, album);
    const lines: LrcLine[] = raw.map((ln) => ({ timeMs: ln.timeMs, text: ln.text }));
    cache.set(key, lines);
    state.lyrics = lines;
    state.activeLyricIndex = -1;
  } catch {
    state.lyrics = [];
    state.activeLyricIndex = -1;
  }
}

export function updateActiveLyric(state: AppState): void {
  if (state.lyrics.length === 0) { state.activeLyricIndex = -1; return; }
  state.activeLyricIndex = activeLyricIndex(state.lyrics, state.progressMs);
}

import { fetchLyrics, activeLyricIndex } from "../../lyrics/lrclib.js";
import type { AppState, LrcLine } from "../state.js";

const cache = new Map<string, LrcLine[]>();

// Lead offset applied when comparing playback position to lyric
// timestamps. Empirically, lines feel correctly synced when they appear
// ~250 ms before the syllable is sung — compensates for AppleScript
// poll latency (~100 ms) and the reading-ahead-of-singing convention
// that LRC files are typically authored with.
export const LYRIC_LEAD_MS = 250;

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
  // Look ahead by LYRIC_LEAD_MS so the current line switches over
  // ~250 ms before the singer reaches it — matches how reading ahead
  // while listening naturally feels correct.
  state.activeLyricIndex = activeLyricIndex(state.lyrics, state.progressMs + LYRIC_LEAD_MS);
}

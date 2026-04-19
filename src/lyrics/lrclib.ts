/**
 * Lyrics service — fetches synced LRC data from lrclib.net and parses
 * it into timestamped lines suitable for the CRT lyrics terminal widget.
 *
 * API: GET https://lrclib.net/api/get?artist_name=X&track_name=Y&album_name=Z
 * LRC: [MM:SS.CC] lyric text
 */

import axios from "axios";

export interface LyricLine {
  timeMs: number;
  text:   string;
}

const LRCLIB = "https://lrclib.net/api/get";

/** Fetch synced lyrics for a track. Returns [] if not found or on error. */
export async function fetchLyrics(
  trackName:  string,
  artistName: string,
  albumName:  string
): Promise<LyricLine[]> {
  try {
    const res = await axios.get<{
      syncedLyrics?: string | null;
      instrumental?: boolean;
    }>(LRCLIB, {
      params: {
        track_name:  trackName,
        artist_name: artistName,
        album_name:  albumName,
      },
      timeout: 8_000,
    });

    const raw = res.data?.syncedLyrics;
    if (!raw || res.data?.instrumental) return [];
    return parseLrc(raw);
  } catch {
    return [];
  }
}

/** Parse an LRC string into sorted, trimmed lyric lines. */
export function parseLrc(raw: string): LyricLine[] {
  const lines: LyricLine[] = [];
  // Match [MM:SS.CC] or [MM:SS] at the start of each line
  const re = /^\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]\s*(.*)/;

  for (const line of raw.split("\n")) {
    const m = line.match(re);
    if (!m) continue;
    const mins   = parseInt(m[1], 10);
    const secs   = parseInt(m[2], 10);
    const millis = m[3] ? parseInt(m[3].padEnd(3, "0"), 10) : 0;
    const text   = m[4].trim();
    if (!text) continue; // skip empty instrumental gaps
    lines.push({ timeMs: mins * 60_000 + secs * 1_000 + millis, text });
  }

  return lines.sort((a, b) => a.timeMs - b.timeMs);
}

/**
 * Given sorted LRC lines and current playback position, return the index
 * of the active line (the last line whose timestamp ≤ progressMs).
 * Returns 0 if nothing has started yet.
 */
export function activeLyricIndex(lines: LyricLine[], progressMs: number): number {
  if (lines.length === 0) return 0;
  let idx = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].timeMs <= progressMs) {
      idx = i;
    } else {
      break;
    }
  }
  return idx;
}

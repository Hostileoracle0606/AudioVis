/**
 * Lyrics service — fetches synced LRC data from lrclib.net and parses
 * it into timestamped lines suitable for the CRT lyrics terminal widget.
 *
 * API: GET https://lrclib.net/api/get?artist_name=X&track_name=Y&album_name=Z
 * LRC: [MM:SS.CC] lyric text
 */
export interface LyricLine {
    timeMs: number;
    text: string;
}
/** Fetch synced lyrics for a track. Returns [] if not found or on error. */
export declare function fetchLyrics(trackName: string, artistName: string, albumName: string): Promise<LyricLine[]>;
/** Parse an LRC string into sorted, trimmed lyric lines. */
export declare function parseLrc(raw: string): LyricLine[];
/**
 * Given sorted LRC lines and current playback position, return the index
 * of the active line (the last line whose timestamp ≤ progressMs).
 * Returns 0 if nothing has started yet.
 */
export declare function activeLyricIndex(lines: LyricLine[], progressMs: number): number;
//# sourceMappingURL=lrclib.d.ts.map
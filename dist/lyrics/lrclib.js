"use strict";
/**
 * Lyrics service — fetches synced LRC data from lrclib.net and parses
 * it into timestamped lines suitable for the CRT lyrics terminal widget.
 *
 * API: GET https://lrclib.net/api/get?artist_name=X&track_name=Y&album_name=Z
 * LRC: [MM:SS.CC] lyric text
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchLyrics = fetchLyrics;
exports.parseLrc = parseLrc;
exports.activeLyricIndex = activeLyricIndex;
const axios_1 = __importDefault(require("axios"));
const LRCLIB = "https://lrclib.net/api/get";
/** Fetch synced lyrics for a track. Returns [] if not found or on error. */
async function fetchLyrics(trackName, artistName, albumName) {
    try {
        const res = await axios_1.default.get(LRCLIB, {
            params: {
                track_name: trackName,
                artist_name: artistName,
                album_name: albumName,
            },
            timeout: 8_000,
        });
        const raw = res.data?.syncedLyrics;
        if (!raw || res.data?.instrumental)
            return [];
        return parseLrc(raw);
    }
    catch {
        return [];
    }
}
/** Parse an LRC string into sorted, trimmed lyric lines. */
function parseLrc(raw) {
    const lines = [];
    // Match [MM:SS.CC] or [MM:SS] at the start of each line
    const re = /^\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]\s*(.*)/;
    for (const line of raw.split("\n")) {
        const m = line.match(re);
        if (!m)
            continue;
        const mins = parseInt(m[1], 10);
        const secs = parseInt(m[2], 10);
        const millis = m[3] ? parseInt(m[3].padEnd(3, "0"), 10) : 0;
        const text = m[4].trim();
        if (!text)
            continue; // skip empty instrumental gaps
        lines.push({ timeMs: mins * 60_000 + secs * 1_000 + millis, text });
    }
    return lines.sort((a, b) => a.timeMs - b.timeMs);
}
/**
 * Given sorted LRC lines and current playback position, return the index
 * of the active line (the last line whose timestamp ≤ progressMs).
 * Returns 0 if nothing has started yet.
 */
function activeLyricIndex(lines, progressMs) {
    if (lines.length === 0)
        return 0;
    let idx = 0;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].timeMs <= progressMs) {
            idx = i;
        }
        else {
            break;
        }
    }
    return idx;
}
//# sourceMappingURL=lrclib.js.map
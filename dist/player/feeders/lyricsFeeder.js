"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LYRIC_LEAD_MS = void 0;
exports.fetchLyricsFor = fetchLyricsFor;
exports.updateActiveLyric = updateActiveLyric;
const lrclib_js_1 = require("../../lyrics/lrclib.js");
const cache = new Map();
// Lead offset applied when comparing playback position to lyric
// timestamps. Empirically, lines feel correctly synced when they appear
// ~250 ms before the syllable is sung — compensates for AppleScript
// poll latency (~100 ms) and the reading-ahead-of-singing convention
// that LRC files are typically authored with.
exports.LYRIC_LEAD_MS = 250;
async function fetchLyricsFor(state, title, artist, album) {
    const key = `${artist}::${title}::${album}`;
    if (cache.has(key)) {
        state.lyrics = cache.get(key);
        state.activeLyricIndex = -1;
        return;
    }
    try {
        const raw = await (0, lrclib_js_1.fetchLyrics)(title, artist, album);
        const lines = raw.map((ln) => ({ timeMs: ln.timeMs, text: ln.text }));
        cache.set(key, lines);
        state.lyrics = lines;
        state.activeLyricIndex = -1;
    }
    catch {
        state.lyrics = [];
        state.activeLyricIndex = -1;
    }
}
function updateActiveLyric(state) {
    if (state.lyrics.length === 0) {
        state.activeLyricIndex = -1;
        return;
    }
    // Look ahead by LYRIC_LEAD_MS so the current line switches over
    // ~250 ms before the singer reaches it — matches how reading ahead
    // while listening naturally feels correct.
    state.activeLyricIndex = (0, lrclib_js_1.activeLyricIndex)(state.lyrics, state.progressMs + exports.LYRIC_LEAD_MS);
}
//# sourceMappingURL=lyricsFeeder.js.map
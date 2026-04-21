"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchLyricsFor = fetchLyricsFor;
exports.updateActiveLyric = updateActiveLyric;
const lrclib_js_1 = require("../../lyrics/lrclib.js");
const cache = new Map();
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
    state.activeLyricIndex = (0, lrclib_js_1.activeLyricIndex)(state.lyrics, state.progressMs);
}
//# sourceMappingURL=lyricsFeeder.js.map
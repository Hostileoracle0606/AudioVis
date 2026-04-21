"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KEY_NAMES = void 0;
exports.computeDna = computeDna;
exports.catalogNumber = catalogNumber;
exports.KEY_NAMES = ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];
function djb2(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++)
        h = (h * 33) ^ s.charCodeAt(i);
    return h >>> 0;
}
function splitmix32(seed) {
    let z = seed >>> 0;
    return () => {
        z = (z + 0x9e3779b9) >>> 0;
        let t = z;
        t = Math.imul(t ^ (t >>> 16), 0x21f0aaad) >>> 0;
        t = Math.imul(t ^ (t >>> 15), 0x735a2d97) >>> 0;
        return (t ^ (t >>> 15)) >>> 0;
    };
}
/** Pure function: same input → same TrackDna. */
function computeDna(id) {
    const seed = djb2(id);
    const next = splitmix32(seed);
    const bpm = 72 + (next() % 97); // 72..168
    const keyIdx = next() % 12;
    const keyMode = (next() & 1) ? "maj" : "min";
    const lufs = -4 - (next() % 16); // -4..-19
    const energy = next() % 101;
    const valence = next() % 101;
    const danceability = next() % 101;
    const acousticness = next() % 101;
    return {
        bpm, key: exports.KEY_NAMES[keyIdx], keyMode, lufs,
        energy, valence, danceability, acousticness,
    };
}
/** Stable short catalog number for a track, zero-padded to 3 chars. */
function catalogNumber(id) {
    return String(djb2(id) % 1000).padStart(3, "0");
}
//# sourceMappingURL=trackDna.js.map
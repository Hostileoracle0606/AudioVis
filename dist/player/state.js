"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInitialState = createInitialState;
exports.pushRecentlyPlayed = pushRecentlyPlayed;
function createInitialState(cols, rows) {
    return {
        cols, rows,
        spectrum: new Float32Array(16),
        meterL: 0, meterR: 0, rms: 0,
        transientPeak: false, transientEnergy: 0,
        nowPlaying: null,
        recentlyPlayed: [],
        isPlaying: false,
        progressMs: 0, durationMs: 0, lastSpotifyPollAt: 0,
        lyrics: [], activeLyricIndex: -1,
        albumArt: null,
        cpuPct: 0,
        spectrumPaletteIndex: 0,
        artCellMode: "art",
        isMuted: false, savedVolume: 50,
        progressBaselineAt: 0, progressBaselineMs: 0,
        lastTransientAt: 0, lastClipAt: 0, lastPeakAt: 0,
        progressEnvelope: new Float32Array(128),
        ledChaserIndex: 0,
        activePadIndex: 0,
        padFingerprints: Array.from({ length: 8 }, () => new Uint8Array(16)),
        quit: false,
    };
}
/**
 * Push a Spotify state onto the recently-played ring.
 * Dedups when head has the same trackName+artistName. Caps length at 8.
 */
function pushRecentlyPlayed(state, entry) {
    const head = state.recentlyPlayed[0];
    if (head && head.trackName === entry.trackName && head.artistName === entry.artistName) {
        return;
    }
    state.recentlyPlayed = [entry, ...state.recentlyPlayed].slice(0, 8);
}
//# sourceMappingURL=state.js.map
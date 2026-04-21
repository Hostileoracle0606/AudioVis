"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveAccentTargets = resolveAccentTargets;
const SYNC_WINDOW_MS = 100;
const BASS_WINDOW_MS = 100;
const LEVEL_WINDOW_MS = 200;
const BASS_ENERGY_THRESHOLD = 0.6;
const LIM_RMS_THRESHOLD = 0.7;
/**
 * Returns the set of accent targets active this frame.
 * Panels are scoped: the lyrics panel always holds "lyric", while the
 * spectrum can separately hold "bass-bin" during onsets, etc. Callers
 * check membership for their own element.
 */
function resolveAccentTargets(state, nowMs) {
    const out = new Set();
    out.add("lyric");
    if (nowMs - state.lastTransientAt <= SYNC_WINDOW_MS)
        out.add("sync");
    if (nowMs - state.lastTransientAt <= BASS_WINDOW_MS && state.transientEnergy > BASS_ENERGY_THRESHOLD) {
        out.add("bass-bin");
    }
    if (nowMs - state.lastClipAt <= LEVEL_WINDOW_MS)
        out.add("clip");
    if (nowMs - state.lastPeakAt <= LEVEL_WINDOW_MS)
        out.add("peak");
    if (state.rms > LIM_RMS_THRESHOLD)
        out.add("lim");
    return out;
}
//# sourceMappingURL=accentArbiter.js.map
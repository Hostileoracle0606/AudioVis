/**
 * Long-running song-character features.
 *
 * Where `features.ts` normalises to the *current* moment (peaks decay in ~3s),
 * this module accumulates over minutes to describe *what kind of song is
 * playing*.  Output fields are designed to be cheap to sample every render
 * frame and to stabilise within the first 10–20 seconds of a track.
 *
 * Tracked quantities:
 *   - bpm          — median inter-onset interval (tempo estimate)
 *   - tempoPhase   — 0..1, synchronised to the inferred beat grid
 *   - brightness   — long-run (high / (low+mid+high))  →  treble-dominance
 *   - warmth       — long-run (low / (low+mid+high))  →  bass-dominance
 *   - dynamics     — rolling stddev of rms  →  "loud-vs-soft" spread
 *   - density      — rolling mean of rms  →  sustained loudness
 *
 * The class is reset on track change so each song starts from a clean slate.
 * Inspired by cava's spectrum-averaging and by the tempo-tracking heuristics
 * used in projects like `aubio` (IOI histogramming), pared down to the
 * cheapest useful subset for a terminal visualiser.
 */
export interface SongFeatures {
    bpm: number;
    tempoPhase: number;
    brightness: number;
    warmth: number;
    dynamics: number;
    density: number;
    confidence: number;
}
export declare class SongFeatureTracker {
    private onsetTimes;
    private lastOnsetMs;
    private lastPulseValue;
    private emaLow;
    private emaMid;
    private emaHigh;
    private rmsWindow;
    private rmsWindowSize;
    private currentBpm;
    private beatPhaseAnchorMs;
    private out;
    reset(): void;
    /**
     * Feed one frame of audio features.  Cheap — O(1) amortised.  Call from
     * whatever code is already pulling per-frame features.
     */
    update(low: number, mid: number, high: number, rms: number, pulse: number, nowMs: number): void;
    get features(): SongFeatures;
    /**
     * Median of recent IOIs, biased toward the most common half.  Taking the
     * median (not the mean) discards outlier intervals — missed beats, swing
     * offbeats, and so on — without needing explicit outlier rejection.
     */
    private estimateBpm;
}
//# sourceMappingURL=songFeatures.d.ts.map
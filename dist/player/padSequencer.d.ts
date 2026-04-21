/**
 * Beat-machine pattern driver.
 *
 * Treats the 8-pad grid as an 8-step sequencer. The current step advances in
 * time with the track's BPM; each pad has a sparse 4×4 LED pattern that
 * shuffles once per beat so the machine *always* feels alive. On audio
 * transients, the active step flashes and a handful of random bulbs across
 * the whole grid flicker on for one frame.
 *
 * All randomness is deterministic — same (trackId, beat) always produces the
 * same pattern — so the grid looks tight and intentional, not chaotic.
 */
export interface PadFrame {
    activeStep: number;
    flashing: boolean;
    flashIntensity: number;
    patterns: Uint8Array[];
    bpm: number;
}
/**
 * Build a deterministic 16-cell pattern with exactly `onCount` bulbs lit.
 * Identical (seed, beat, padIdx, onCount) produces identical output.
 */
export declare function buildPattern(seed: number, beat: number, padIdx: number, onCount: number): Uint8Array;
/** Compute the current beat-machine frame from player state. */
export declare function computePadFrame(trackId: string | null, bpmHint: number, progressMs: number, lastTransientAt: number, nowMs: number): PadFrame;
//# sourceMappingURL=padSequencer.d.ts.map
"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPattern = buildPattern;
exports.computePadFrame = computePadFrame;
const BEATS_PER_STEP = 0.5; // two steps per beat (8th-note grid)
const STEPS_PER_BAR = 8; // 8 pads
const FLASH_WINDOW_MS = 160; // transient flash decay
const SPARKLE_RATE = 3; // ~% of off-pad bulbs that spark on flash
const STEP_LEDS_ON = 9; // filled LEDs in the active step (of 16)
const IDLE_LEDS_ON = 3; // filled LEDs in a non-active step
function djb2(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++)
        h = (h * 33) ^ s.charCodeAt(i);
    return h >>> 0;
}
function hash32(a, b, c) {
    let z = (a ^ Math.imul(b, 0x85ebca77) ^ Math.imul(c, 0xc2b2ae3d)) >>> 0;
    z = Math.imul(z ^ (z >>> 16), 0x21f0aaad) >>> 0;
    z = Math.imul(z ^ (z >>> 15), 0x735a2d97) >>> 0;
    return (z ^ (z >>> 15)) >>> 0;
}
/**
 * Build a deterministic 16-cell pattern with exactly `onCount` bulbs lit.
 * Identical (seed, beat, padIdx, onCount) produces identical output.
 */
function buildPattern(seed, beat, padIdx, onCount) {
    const out = new Uint8Array(16);
    if (onCount <= 0)
        return out;
    if (onCount >= 16) {
        out.fill(1);
        return out;
    }
    // Fisher-Yates-style selection of `onCount` unique positions.
    const indices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    let s = hash32(seed, beat, padIdx);
    for (let i = 15; i > 0; i--) {
        s = Math.imul(s ^ (s >>> 13), 0x5bd1e995) >>> 0;
        const j = s % (i + 1);
        const tmp = indices[i];
        indices[i] = indices[j];
        indices[j] = tmp;
    }
    for (let i = 0; i < onCount; i++)
        out[indices[i]] = 1;
    return out;
}
/** Compute the current beat-machine frame from player state. */
function computePadFrame(trackId, bpmHint, progressMs, lastTransientAt, nowMs) {
    const bpm = Math.max(30, Math.min(240, bpmHint));
    const beatMs = 60000 / bpm;
    const stepMs = beatMs * BEATS_PER_STEP;
    const totalSteps = Math.max(0, Math.floor(progressMs / stepMs));
    const activeStep = totalSteps % STEPS_PER_BAR;
    const beat = Math.floor(progressMs / beatMs);
    const dt = Math.max(0, nowMs - lastTransientAt);
    const flashing = dt < FLASH_WINDOW_MS;
    const flashIntensity = flashing ? 1 - dt / FLASH_WINDOW_MS : 0;
    const seed = trackId ? djb2(trackId) : 0x9e3779b1;
    const patterns = new Array(STEPS_PER_BAR);
    for (let p = 0; p < STEPS_PER_BAR; p++) {
        const isActive = p === activeStep;
        const baseCount = isActive ? STEP_LEDS_ON : IDLE_LEDS_ON;
        const pattern = buildPattern(seed, beat, p, baseCount);
        if (flashing && !isActive)
            sprinkle(pattern, seed ^ beat, p, nowMs, flashIntensity);
        patterns[p] = pattern;
    }
    return { activeStep, flashing, flashIntensity, patterns, bpm };
}
function sprinkle(pattern, seed, padIdx, nowMs, intensity) {
    const extras = Math.max(0, Math.min(10, Math.round(intensity * SPARKLE_RATE)));
    let s = hash32(seed, padIdx, nowMs | 0);
    for (let i = 0; i < extras; i++) {
        s = Math.imul(s ^ (s >>> 13), 0x5bd1e995) >>> 0;
        pattern[s % 16] = 1;
    }
}
//# sourceMappingURL=padSequencer.js.map
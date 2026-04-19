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
  bpm: number;          // 0 until enough beats observed; then 60..180 typical
  tempoPhase: number;   // 0..1
  brightness: number;   // 0..1
  warmth: number;       // 0..1
  dynamics: number;     // 0..1  (~stddev of rms, clamped)
  density: number;      // 0..1  (~mean of rms)
  confidence: number;   // 0..1  — how trustworthy bpm/phase are right now
}

const EMPTY: SongFeatures = {
  bpm: 0,
  tempoPhase: 0,
  brightness: 0,
  warmth: 0,
  dynamics: 0,
  density: 0,
  confidence: 0,
};

// Onset-interval ring buffer.  At 120 bpm that's 500 ms between beats, so 16
// entries covers ~8 seconds — enough for a stable median, short enough that a
// tempo change inside a song is picked up within a bar or two.
const ONSET_RING = 16;

export class SongFeatureTracker {
  private onsetTimes: number[] = []; // wall-clock ms of recent onsets
  private lastOnsetMs = 0;
  private lastPulseValue = 0;

  // Long-run band-ratio averages (EMA with very slow alpha).
  private emaLow = 0;
  private emaMid = 0;
  private emaHigh = 0;

  // Rolling rms statistics for dynamics/density.
  // Using Welford-ish online moments would be cleaner, but a simple
  // windowed array of the last N rms values is plenty at 30 fps.
  private rmsWindow: number[] = [];
  private rmsWindowSize = 300; // 10s at 30fps

  private currentBpm = 0;
  private beatPhaseAnchorMs = 0; // time of the most recent accepted beat

  private out: SongFeatures = { ...EMPTY };

  reset(): void {
    this.onsetTimes.length = 0;
    this.lastOnsetMs = 0;
    this.lastPulseValue = 0;
    this.emaLow = 0;
    this.emaMid = 0;
    this.emaHigh = 0;
    this.rmsWindow.length = 0;
    this.currentBpm = 0;
    this.beatPhaseAnchorMs = 0;
    this.out = { ...EMPTY };
  }

  /**
   * Feed one frame of audio features.  Cheap — O(1) amortised.  Call from
   * whatever code is already pulling per-frame features.
   */
  update(
    low: number,
    mid: number,
    high: number,
    rms: number,
    pulse: number,
    nowMs: number
  ): void {
    // ── Onset detection for BPM ─────────────────────────────────────────────
    // We look for a rising edge on `pulse`: crossing above threshold while
    // the previous sample was below.  Refractory period of 200 ms stops us
    // double-counting a single kick.
    const ONSET_TH = 0.45;
    const REFRACTORY_MS = 200;
    if (
      pulse > ONSET_TH &&
      this.lastPulseValue <= ONSET_TH &&
      nowMs - this.lastOnsetMs > REFRACTORY_MS
    ) {
      if (this.lastOnsetMs > 0) {
        const ioi = nowMs - this.lastOnsetMs;
        // Keep only musically plausible intervals: 250–1500 ms (40–240 bpm).
        if (ioi > 250 && ioi < 1500) {
          this.onsetTimes.push(ioi);
          if (this.onsetTimes.length > ONSET_RING) this.onsetTimes.shift();
          this.currentBpm = this.estimateBpm();
          this.beatPhaseAnchorMs = nowMs; // sync phase to this onset
        }
      }
      this.lastOnsetMs = nowMs;
    }
    this.lastPulseValue = pulse;

    // ── Long-run band-ratio EMAs ────────────────────────────────────────────
    // alpha = 0.002 → time-constant ~500 frames ~= 17 s at 30fps.  Slow
    // enough that "song character" stabilises, fast enough that a track
    // change is forgotten within a second of calling reset() and then
    // retrained within ~20 s.
    const ALPHA = 0.002;
    this.emaLow  = (1 - ALPHA) * this.emaLow  + ALPHA * low;
    this.emaMid  = (1 - ALPHA) * this.emaMid  + ALPHA * mid;
    this.emaHigh = (1 - ALPHA) * this.emaHigh + ALPHA * high;

    // ── Rolling rms window ──────────────────────────────────────────────────
    this.rmsWindow.push(rms);
    if (this.rmsWindow.length > this.rmsWindowSize) this.rmsWindow.shift();

    // ── Materialise output ──────────────────────────────────────────────────
    const total = this.emaLow + this.emaMid + this.emaHigh + 1e-6;
    this.out.brightness = Math.min(1, this.emaHigh / total * 2.0); // ×2 so 0.5 → bright
    this.out.warmth     = Math.min(1, this.emaLow  / total * 2.0);

    const { mean, stddev } = meanStd(this.rmsWindow);
    this.out.density  = Math.min(1, mean * 1.5);
    this.out.dynamics = Math.min(1, stddev * 4.0);

    this.out.bpm = this.currentBpm;
    this.out.confidence = this.onsetTimes.length >= 4
      ? Math.min(1, this.onsetTimes.length / 10)
      : 0;

    // Phase: how far we are into the current beat, 0..1.
    if (this.currentBpm > 0 && this.beatPhaseAnchorMs > 0) {
      const beatMs = 60000 / this.currentBpm;
      const since = (nowMs - this.beatPhaseAnchorMs) % beatMs;
      this.out.tempoPhase = since / beatMs;
    } else {
      // Fallback: free-running 0.5Hz oscillator so "tempo phase" is never
      // flat zero — keeps effects that lean on it alive during silence/intro.
      this.out.tempoPhase = ((nowMs - (this.beatPhaseAnchorMs || nowMs)) / 2000) % 1;
    }
  }

  get features(): SongFeatures {
    return this.out;
  }

  /**
   * Median of recent IOIs, biased toward the most common half.  Taking the
   * median (not the mean) discards outlier intervals — missed beats, swing
   * offbeats, and so on — without needing explicit outlier rejection.
   */
  private estimateBpm(): number {
    if (this.onsetTimes.length < 3) return this.currentBpm;
    const sorted = [...this.onsetTimes].sort((a, b) => a - b);
    const mid = sorted[Math.floor(sorted.length / 2)];
    const bpm = 60000 / mid;
    // Gentle smoothing so a single wonky interval doesn't swing the estimate.
    return this.currentBpm === 0 ? bpm : this.currentBpm * 0.7 + bpm * 0.3;
  }
}

function meanStd(xs: number[]): { mean: number; stddev: number } {
  if (xs.length === 0) return { mean: 0, stddev: 0 };
  let sum = 0;
  for (const x of xs) sum += x;
  const mean = sum / xs.length;
  let sumSq = 0;
  for (const x of xs) {
    const d = x - mean;
    sumSq += d * d;
  }
  return { mean, stddev: Math.sqrt(sumSq / xs.length) };
}

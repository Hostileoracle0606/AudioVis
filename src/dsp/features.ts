/**
 * High-level audio features extracted from FFT magnitudes.
 * These drive the wavefield visualizer mode.
 *
 * Band definitions (approximate, assumes 44100 Hz sample rate):
 *   low:  20 –  300 Hz  → bass/kick energy
 *   mid: 300 – 3000 Hz  → melodic/vocal energy
 *   high: 3k – 16k  Hz  → treble/hi-hat energy
 */

export interface AudioFeatures {
  low: number;    // [0, 1]
  mid: number;    // [0, 1]
  high: number;   // [0, 1]
  rms: number;    // [0, 1]  overall amplitude
  pulse: number;  // [0, 1]  kick-driven pulse
}

const EMPTY: AudioFeatures = { low: 0, mid: 0, high: 0, rms: 0, pulse: 0 };

/** Running peak for each band — decays slowly to stay normalised. */
const peaks = { low: 1e-6, mid: 1e-6, high: 1e-6, rms: 1e-6 };

/** Previous low value for pulse detection */
let prevLow = 0;

function bandEnergy(
  mags: Float32Array,
  numBins: number,
  sampleRate: number,
  freqLo: number,
  freqHi: number
): number {
  const nyquist = sampleRate / 2;
  const startBin = Math.max(0, Math.round((freqLo / nyquist) * numBins));
  const endBin = Math.min(numBins, Math.round((freqHi / nyquist) * numBins) + 1);
  if (endBin <= startBin) return 0;

  let sum = 0;
  for (let i = startBin; i < endBin; i++) sum += mags[i];
  return sum / (endBin - startBin);
}

export function extractFeatures(
  magnitudes: Float32Array,
  sampleRate: number
): AudioFeatures {
  if (magnitudes.length === 0) return EMPTY;

  const n = magnitudes.length;

  const rawLow = bandEnergy(magnitudes, n, sampleRate, 20, 300);
  const rawMid = bandEnergy(magnitudes, n, sampleRate, 300, 3000);
  const rawHigh = bandEnergy(magnitudes, n, sampleRate, 3000, 16000);

  // RMS of the full spectrum as a proxy for overall amplitude
  let sumSq = 0;
  for (let i = 0; i < n; i++) sumSq += magnitudes[i] * magnitudes[i];
  const rawRms = Math.sqrt(sumSq / n);

  // Update running peaks (slow decay)
  const DECAY = 0.9997;
  peaks.low = Math.max(peaks.low * DECAY, rawLow + 1e-9);
  peaks.mid = Math.max(peaks.mid * DECAY, rawMid + 1e-9);
  peaks.high = Math.max(peaks.high * DECAY, rawHigh + 1e-9);
  peaks.rms = Math.max(peaks.rms * DECAY, rawRms + 1e-9);

  const low = Math.min(1, rawLow / peaks.low);
  const mid = Math.min(1, rawMid / peaks.mid);
  const high = Math.min(1, rawHigh / peaks.high);
  const rms = Math.min(1, rawRms / peaks.rms);

  // Pulse: detect a sharp low-band onset
  const delta = low - prevLow;
  const pulse = Math.min(1, Math.max(0, delta * 4));
  prevLow = low;

  return { low, mid, high, rms, pulse };
}

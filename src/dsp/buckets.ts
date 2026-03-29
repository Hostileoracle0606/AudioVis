/**
 * Map FFT magnitude bins into a smaller number of visual buckets using a
 * perceptual (roughly logarithmic) frequency mapping.
 *
 * Human pitch perception is logarithmic, so grouping bins linearly produces
 * too many bass buckets and too few high-frequency buckets. We allocate bins
 * so that each bucket spans a constant number of semitones (mel-ish).
 */

const MIN_FREQ = 30;   // Hz — ignore sub-bass rumble
const MAX_FREQ = 16000; // Hz — ignore inaudible high content

/**
 * Build the start/end bin index for each bucket.
 * Returns an array of [startBin, endBin] pairs (endBin exclusive).
 */
function buildBucketRanges(
  numBuckets: number,
  numBins: number,
  sampleRate: number
): Array<[number, number]> {
  const nyquist = sampleRate / 2;
  const minLog = Math.log(Math.max(1, MIN_FREQ));
  const maxLog = Math.log(Math.min(nyquist, MAX_FREQ));

  const ranges: Array<[number, number]> = [];

  for (let b = 0; b < numBuckets; b++) {
    const lo = Math.exp(minLog + (b / numBuckets) * (maxLog - minLog));
    const hi = Math.exp(minLog + ((b + 1) / numBuckets) * (maxLog - minLog));

    const startBin = Math.max(0, Math.round((lo / nyquist) * numBins));
    const endBin = Math.min(numBins, Math.round((hi / nyquist) * numBins) + 1);

    ranges.push([startBin, endBin]);
  }

  return ranges;
}

let _ranges: Array<[number, number]> | null = null;
let _lastConfig = "";

/**
 * Compute normalised [0, 1] bucket amplitudes from raw FFT magnitudes.
 *
 * @param magnitudes  Output of computeMagnitudeSpectrum()
 * @param numBuckets  Number of visual bars/buckets
 * @param sampleRate  Audio sample rate (Hz)
 * @param peak        Running peak magnitude for normalisation (updated in place)
 */
export function computeBuckets(
  magnitudes: Float32Array,
  numBuckets: number,
  sampleRate: number,
  peak: { value: number }
): Float32Array {
  const cfg = `${magnitudes.length}:${numBuckets}:${sampleRate}`;
  if (cfg !== _lastConfig) {
    _ranges = buildBucketRanges(numBuckets, magnitudes.length, sampleRate);
    _lastConfig = cfg;
  }

  const buckets = new Float32Array(numBuckets);

  for (let b = 0; b < numBuckets; b++) {
    const [start, end] = _ranges![b];
    if (end <= start) continue;

    let sum = 0;
    for (let i = start; i < end; i++) {
      sum += magnitudes[i];
    }
    buckets[b] = sum / (end - start);
  }

  // Update running peak for normalisation.
  const max = Math.max(...buckets);
  if (max > peak.value) peak.value = max;
  else peak.value *= 0.9998; // slow decay so display doesn't get stuck dark

  const p = peak.value || 1e-6;
  for (let b = 0; b < numBuckets; b++) {
    buckets[b] = Math.min(1, buckets[b] / p);
  }

  return buckets;
}

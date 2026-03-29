/**
 * Map FFT magnitude bins into a smaller number of visual buckets using a
 * perceptual (roughly logarithmic) frequency mapping.
 *
 * Human pitch perception is logarithmic, so grouping bins linearly produces
 * too many bass buckets and too few high-frequency buckets. We allocate bins
 * so that each bucket spans a constant number of semitones (mel-ish).
 */
/**
 * Compute normalised [0, 1] bucket amplitudes from raw FFT magnitudes.
 *
 * @param magnitudes  Output of computeMagnitudeSpectrum()
 * @param numBuckets  Number of visual bars/buckets
 * @param sampleRate  Audio sample rate (Hz)
 * @param peak        Running peak magnitude for normalisation (updated in place)
 */
export declare function computeBuckets(magnitudes: Float32Array, numBuckets: number, sampleRate: number, peak: {
    value: number;
}): Float32Array;
//# sourceMappingURL=buckets.d.ts.map
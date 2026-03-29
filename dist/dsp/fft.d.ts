/**
 * Lightweight FFT implementation using the Cooley–Tukey radix-2 DIT algorithm.
 * Input length must be a power of 2.
 * Returns magnitude spectrum for positive frequencies only (length = N/2).
 */
/**
 * Compute FFT magnitude spectrum of a real-valued audio frame.
 * Returns magnitudes for bins 0..N/2 (positive frequencies).
 *
 * The output is normalised by N/2 so that values are roughly amplitude-scaled.
 */
export declare function computeMagnitudeSpectrum(frame: Float32Array): Float32Array;
//# sourceMappingURL=fft.d.ts.map
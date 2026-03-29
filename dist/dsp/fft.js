"use strict";
/**
 * Lightweight FFT implementation using the Cooley–Tukey radix-2 DIT algorithm.
 * Input length must be a power of 2.
 * Returns magnitude spectrum for positive frequencies only (length = N/2).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeMagnitudeSpectrum = computeMagnitudeSpectrum;
function hannWindow(n) {
    const w = new Float32Array(n);
    for (let i = 0; i < n; i++) {
        w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
    }
    return w;
}
/**
 * In-place Cooley–Tukey FFT on real + imaginary arrays.
 * Both arrays must have the same power-of-2 length.
 */
function fftInPlace(re, im) {
    const n = re.length;
    // Bit-reversal permutation
    let j = 0;
    for (let i = 1; i < n; i++) {
        let bit = n >> 1;
        for (; j & bit; bit >>= 1)
            j ^= bit;
        j ^= bit;
        if (i < j) {
            [re[i], re[j]] = [re[j], re[i]];
            [im[i], im[j]] = [im[j], im[i]];
        }
    }
    // Butterfly stages
    for (let len = 2; len <= n; len <<= 1) {
        const halfLen = len >> 1;
        const wRe = Math.cos((2 * Math.PI) / len);
        const wIm = -Math.sin((2 * Math.PI) / len);
        for (let i = 0; i < n; i += len) {
            let curRe = 1;
            let curIm = 0;
            for (let k = 0; k < halfLen; k++) {
                const uRe = re[i + k];
                const uIm = im[i + k];
                const vRe = re[i + k + halfLen] * curRe - im[i + k + halfLen] * curIm;
                const vIm = re[i + k + halfLen] * curIm + im[i + k + halfLen] * curRe;
                re[i + k] = uRe + vRe;
                im[i + k] = uIm + vIm;
                re[i + k + halfLen] = uRe - vRe;
                im[i + k + halfLen] = uIm - vIm;
                const nextRe = curRe * wRe - curIm * wIm;
                curIm = curRe * wIm + curIm * wRe;
                curRe = nextRe;
            }
        }
    }
}
// Pre-allocated workspace to avoid GC pressure.
let _re = null;
let _im = null;
let _win = null;
/**
 * Compute FFT magnitude spectrum of a real-valued audio frame.
 * Returns magnitudes for bins 0..N/2 (positive frequencies).
 *
 * The output is normalised by N/2 so that values are roughly amplitude-scaled.
 */
function computeMagnitudeSpectrum(frame) {
    const n = frame.length;
    if (!_re || _re.length !== n) {
        _re = new Float32Array(n);
        _im = new Float32Array(n);
        _win = hannWindow(n);
    }
    // Apply Hann window
    for (let i = 0; i < n; i++) {
        _re[i] = frame[i] * _win[i];
        _im[i] = 0;
    }
    fftInPlace(_re, _im);
    // Compute magnitudes for positive frequencies only
    const half = n >> 1;
    const mags = new Float32Array(half);
    const scale = 2 / n;
    for (let i = 0; i < half; i++) {
        mags[i] = Math.sqrt(_re[i] * _re[i] + _im[i] * _im[i]) * scale;
    }
    return mags;
}
//# sourceMappingURL=fft.js.map
/**
 * Return the absolute peak value per channel from an interleaved PCM buffer.
 * Samples are expected in [-1, 1]; the result is clamped to [0, 1].
 */
export function extractChannelPeaks(
  interleaved: Float32Array,
  numChannels: number,
): number[] {
  const peaks = new Array<number>(numChannels).fill(0);
  const n = interleaved.length;
  for (let i = 0; i < n; i++) {
    const ch = i % numChannels;
    const v = Math.abs(interleaved[i]);
    if (v > peaks[ch]) peaks[ch] = v;
  }
  for (let c = 0; c < numChannels; c++) {
    if (peaks[c] > 1) peaks[c] = 1;
  }
  return peaks;
}

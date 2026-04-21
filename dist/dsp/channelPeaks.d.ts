/**
 * Return the absolute peak value per channel from an interleaved PCM buffer.
 * Samples are expected in [-1, 1]; the result is clamped to [0, 1].
 */
export declare function extractChannelPeaks(interleaved: Float32Array, numChannels: number): number[];
//# sourceMappingURL=channelPeaks.d.ts.map
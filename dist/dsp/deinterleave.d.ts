/**
 * Mix an interleaved multi-channel buffer to a mono Float32Array by averaging
 * all channels per sample index. For numChannels=1 this is just a copy.
 */
export declare function mixToMono(interleaved: Float32Array, numChannels: number): Float32Array;
/**
 * Extract one channel from an interleaved buffer. channelIndex is 0-based.
 */
export declare function extractChannel(interleaved: Float32Array, numChannels: number, channelIndex: number): Float32Array;
//# sourceMappingURL=deinterleave.d.ts.map
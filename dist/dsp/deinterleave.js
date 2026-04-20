"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mixToMono = mixToMono;
exports.extractChannel = extractChannel;
/**
 * Mix an interleaved multi-channel buffer to a mono Float32Array by averaging
 * all channels per sample index. For numChannels=1 this is just a copy.
 */
function mixToMono(interleaved, numChannels) {
    if (numChannels === 1)
        return interleaved.slice();
    const frames = Math.floor(interleaved.length / numChannels);
    const out = new Float32Array(frames);
    for (let f = 0; f < frames; f++) {
        let sum = 0;
        for (let c = 0; c < numChannels; c++) {
            sum += interleaved[f * numChannels + c];
        }
        out[f] = sum / numChannels;
    }
    return out;
}
/**
 * Extract one channel from an interleaved buffer. channelIndex is 0-based.
 */
function extractChannel(interleaved, numChannels, channelIndex) {
    const frames = Math.floor(interleaved.length / numChannels);
    const out = new Float32Array(frames);
    for (let f = 0; f < frames; f++) {
        out[f] = interleaved[f * numChannels + channelIndex];
    }
    return out;
}
//# sourceMappingURL=deinterleave.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractChannelPeaks = extractChannelPeaks;
/**
 * Return the absolute peak value per channel from an interleaved PCM buffer.
 * Samples are expected in [-1, 1]; the result is clamped to [0, 1].
 */
function extractChannelPeaks(interleaved, numChannels) {
    const peaks = new Array(numChannels).fill(0);
    const n = interleaved.length;
    for (let i = 0; i < n; i++) {
        const ch = i % numChannels;
        const v = Math.abs(interleaved[i]);
        if (v > peaks[ch])
            peaks[ch] = v;
    }
    for (let c = 0; c < numChannels; c++) {
        if (peaks[c] > 1)
            peaks[c] = 1;
    }
    return peaks;
}
//# sourceMappingURL=channelPeaks.js.map
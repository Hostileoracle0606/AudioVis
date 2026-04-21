"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startAudioFeeder = startAudioFeeder;
const fft_js_1 = require("../../dsp/fft.js");
const buckets_js_1 = require("../../dsp/buckets.js");
const smoothing_js_1 = require("../../dsp/smoothing.js");
const features_js_1 = require("../../dsp/features.js");
const deinterleave_js_1 = require("../../dsp/deinterleave.js");
const channelPeaks_js_1 = require("../../dsp/channelPeaks.js");
const NUM_BARS = 16;
const ENERGY_DECAY_PER_FRAME = 0.04;
const METER_SMOOTHING = { attack: 0.6, decay: 0.4 };
const TRANSIENT_PULSE_THRESHOLD = 0.55;
function startAudioFeeder(audio, state) {
    const info = audio.getInfo();
    const bucketPeak = { value: 1e-6 };
    const prevBuckets = new Float32Array(NUM_BARS);
    audio.onFrame((interleaved) => {
        const peaks = (0, channelPeaks_js_1.extractChannelPeaks)(interleaved, info.numChannels);
        const l = peaks[0] ?? 0;
        const r = peaks[info.numChannels > 1 ? 1 : 0] ?? 0;
        state.meterL = (0, smoothing_js_1.smoothValue)(state.meterL, l, METER_SMOOTHING);
        state.meterR = (0, smoothing_js_1.smoothValue)(state.meterR, r, METER_SMOOTHING);
        const mono = (0, deinterleave_js_1.mixToMono)(interleaved, info.numChannels);
        const spec = (0, fft_js_1.computeMagnitudeSpectrum)(mono);
        const raw = (0, buckets_js_1.computeBuckets)(spec, NUM_BARS, info.sampleRate, bucketPeak);
        (0, smoothing_js_1.smoothBuckets)(prevBuckets, raw, smoothing_js_1.DEFAULT_BAR_SMOOTHING);
        for (let i = 0; i < NUM_BARS; i++)
            state.spectrum[i] = prevBuckets[i];
        const f = (0, features_js_1.extractFeatures)(spec, info.sampleRate);
        state.rms = (0, smoothing_js_1.smoothValue)(state.rms, f.rms, smoothing_js_1.DEFAULT_ENERGY_SMOOTHING);
        state.transientPeak = f.pulse >= TRANSIENT_PULSE_THRESHOLD;
        state.transientEnergy = state.transientPeak
            ? 1.0
            : Math.max(0, state.transientEnergy - ENERGY_DECAY_PER_FRAME);
    });
}
//# sourceMappingURL=audioFeeder.js.map
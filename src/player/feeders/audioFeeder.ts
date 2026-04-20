import type { AudioSource } from "../../audio/AudioSource.js";
import type { AppState } from "../state.js";
import { computeMagnitudeSpectrum } from "../../dsp/fft.js";
import { computeBuckets } from "../../dsp/buckets.js";
import {
  smoothBuckets,
  smoothValue,
  DEFAULT_BAR_SMOOTHING,
  DEFAULT_ENERGY_SMOOTHING,
} from "../../dsp/smoothing.js";
import { extractFeatures } from "../../dsp/features.js";
import { mixToMono } from "../../dsp/deinterleave.js";
import { extractChannelPeaks } from "../../dsp/channelPeaks.js";

const NUM_BARS = 16;
const ENERGY_DECAY_PER_FRAME = 0.04;
const METER_SMOOTHING = { attack: 0.6, decay: 0.4 };
const TRANSIENT_PULSE_THRESHOLD = 0.55;

export function startAudioFeeder(audio: AudioSource, state: AppState): void {
  const info = audio.getInfo();
  const bucketPeak = { value: 1e-6 };
  const prevBuckets = new Float32Array(NUM_BARS);

  audio.onFrame((interleaved) => {
    const peaks = extractChannelPeaks(interleaved, info.numChannels);
    const l = peaks[0] ?? 0;
    const r = peaks[info.numChannels > 1 ? 1 : 0] ?? 0;
    state.meterL = smoothValue(state.meterL, l, METER_SMOOTHING);
    state.meterR = smoothValue(state.meterR, r, METER_SMOOTHING);

    const mono = mixToMono(interleaved, info.numChannels);
    const spec = computeMagnitudeSpectrum(mono);
    const raw = computeBuckets(spec, NUM_BARS, info.sampleRate, bucketPeak);
    smoothBuckets(prevBuckets, raw, DEFAULT_BAR_SMOOTHING);
    for (let i = 0; i < NUM_BARS; i++) state.spectrum[i] = prevBuckets[i];

    const f = extractFeatures(spec, info.sampleRate);
    state.rms = smoothValue(state.rms, f.rms, DEFAULT_ENERGY_SMOOTHING);
    state.transientPeak = f.pulse >= TRANSIENT_PULSE_THRESHOLD;
    state.transientEnergy = state.transientPeak
      ? 1.0
      : Math.max(0, state.transientEnergy - ENERGY_DECAY_PER_FRAME);
  });
}

/**
 * Linux audio capture via PulseAudio or PipeWire monitor source.
 *
 * Strategy:
 *   1. Spawn `parecord --monitor` (or `pw-record`) with raw f32le output.
 *   2. Pipe stdout into a rolling buffer.
 *   3. Emit Float32Array frames of `frameSize` samples.
 *
 * The monitor source captures whatever is playing through the default
 * audio output — no extra configuration needed on most desktop distros.
 *
 * If you have multiple sinks you can select one with --audio-device:
 *   myviz visualizer --audio-device alsa_output.pci-0000_00_1f.3.analog-stereo.monitor
 */
import type { AudioSource, AudioSourceOptions } from "../AudioSource.js";
export declare function createLinuxAudioSource(opts: AudioSourceOptions): AudioSource;
//# sourceMappingURL=linux.d.ts.map
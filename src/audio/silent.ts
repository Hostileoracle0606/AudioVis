import type { AudioSource, AudioSourceOptions, AudioSourceInfo } from "./AudioSource.js";

/**
 * Silent audio source — emits zero-filled frames at the target FPS rate.
 * Useful for testing the visualizer UI and Spotify metadata / album art
 * without a real audio capture device (e.g. no BlackHole on macOS).
 *
 * Usage: myviz visualizer --silent
 */
export function createSilentAudioSource(opts: AudioSourceOptions): AudioSource {
  const { sampleRate, frameSize } = opts;
  const listeners: Array<(frame: Float32Array) => void> = [];
  const NUM_CHANNELS = 2;
  const zeros = new Float32Array(frameSize * NUM_CHANNELS);  // interleaved stereo
  let timer: ReturnType<typeof setInterval> | null = null;

  // Emit frames at ~30 Hz (matching the default render FPS)
  const intervalMs = Math.round(1000 / 30);

  return {
    getInfo(): AudioSourceInfo {
      return { platform: process.platform, device: "silent", sampleRate, frameSize, numChannels: NUM_CHANNELS };
    },

    onFrame(cb: (frame: Float32Array) => void): void {
      listeners.push(cb);
    },

    async start(): Promise<void> {
      timer = setInterval(() => {
        for (const cb of listeners) cb(zeros);
      }, intervalMs);
    },

    async stop(): Promise<void> {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    },
  };
}

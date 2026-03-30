import type { AudioSource, AudioSourceOptions } from "./AudioSource.js";
/**
 * Silent audio source — emits zero-filled frames at the target FPS rate.
 * Useful for testing the visualizer UI and Spotify metadata / album art
 * without a real audio capture device (e.g. no BlackHole on macOS).
 *
 * Usage: myviz visualizer --silent
 */
export declare function createSilentAudioSource(opts: AudioSourceOptions): AudioSource;
//# sourceMappingURL=silent.d.ts.map
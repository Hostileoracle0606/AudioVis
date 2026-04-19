import type { AudioSource, AudioSourceOptions } from "./AudioSource.js";
/**
 * Factory: selects the correct platform backend based on process.platform
 * and constructs an AudioSource with the given options.
 *
 * Pass `silent: true` to skip audio capture entirely (emits zero-filled
 * frames) — useful for testing the visualizer UI without a real audio device.
 */
export declare function createAudioSource(opts: AudioSourceOptions & {
    silent?: boolean;
}): AudioSource;
//# sourceMappingURL=createAudioSource.d.ts.map
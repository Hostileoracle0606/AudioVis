"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSilentAudioSource = createSilentAudioSource;
/**
 * Silent audio source — emits zero-filled frames at the target FPS rate.
 * Useful for testing the visualizer UI and Spotify metadata / album art
 * without a real audio capture device (e.g. no BlackHole on macOS).
 *
 * Usage: myviz visualizer --silent
 */
function createSilentAudioSource(opts) {
    const { sampleRate, frameSize } = opts;
    const listeners = [];
    const NUM_CHANNELS = 2;
    const zeros = new Float32Array(frameSize * NUM_CHANNELS); // interleaved stereo
    let timer = null;
    // Emit frames at ~30 Hz (matching the default render FPS)
    const intervalMs = Math.round(1000 / 30);
    return {
        getInfo() {
            return { platform: process.platform, device: "silent", sampleRate, frameSize, numChannels: NUM_CHANNELS };
        },
        onFrame(cb) {
            listeners.push(cb);
        },
        async start() {
            timer = setInterval(() => {
                for (const cb of listeners)
                    cb(zeros);
            }, intervalMs);
        },
        async stop() {
            if (timer) {
                clearInterval(timer);
                timer = null;
            }
        },
    };
}
//# sourceMappingURL=silent.js.map
"use strict";
/**
 * Windows audio capture via ffmpeg WASAPI loopback.
 *
 * Requirements:
 *   - ffmpeg must be installed and on PATH (winget install ffmpeg)
 *
 * By default this captures the default WASAPI loopback (system output).
 * You can specify a device name with --audio-device, e.g.:
 *   myviz visualizer --audio-device "Stereo Mix"
 *
 * To list available dshow devices:
 *   ffmpeg -list_devices true -f dshow -i dummy
 *
 * Implementation notes:
 *   ffmpeg is used with -f dshow and the loopback flag to capture
 *   system output audio as raw f32le mono PCM piped to stdout.
 *
 * WASAPI loopback alternative (if dshow fails):
 *   ffmpeg -f wasapi -loopback 1 -i default -ac 1 -ar <rate> -f f32le pipe:1
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWindowsAudioSource = createWindowsAudioSource;
const child_process_1 = require("child_process");
const ffmpeg_js_1 = require("../ffmpeg.js");
function createWindowsAudioSource(opts) {
    const { sampleRate, frameSize } = opts;
    const deviceName = opts.deviceName ?? "default";
    let proc = null;
    const listeners = [];
    let buffer = Buffer.alloc(0);
    const NUM_CHANNELS = 2;
    const bytesPerFrame = frameSize * NUM_CHANNELS * 4; // interleaved stereo f32le
    function buildArgs() {
        if (deviceName === "default") {
            // WASAPI loopback — captures whatever is playing on the default output
            return [
                "-hide_banner", "-loglevel", "error",
                "-f", "wasapi",
                "-loopback", "1",
                "-i", "default",
                "-ac", String(NUM_CHANNELS),
                "-ar", String(sampleRate),
                "-f", "f32le",
                "pipe:1",
            ];
        }
        // DirectShow loopback device by name
        return [
            "-hide_banner", "-loglevel", "error",
            "-f", "dshow",
            "-i", `audio=${deviceName}`,
            "-ac", String(NUM_CHANNELS),
            "-ar", String(sampleRate),
            "-f", "f32le",
            "pipe:1",
        ];
    }
    return {
        getInfo() {
            return { platform: "windows", device: deviceName, sampleRate, frameSize, numChannels: NUM_CHANNELS };
        },
        onFrame(cb) {
            listeners.push(cb);
        },
        async start() {
            return new Promise((resolve, reject) => {
                proc = (0, child_process_1.spawn)((0, ffmpeg_js_1.resolveFfmpegBinary)(), buildArgs(), {
                    stdio: ["ignore", "pipe", "pipe"],
                });
                proc.on("error", (err) => {
                    reject(new Error(`Failed to start ffmpeg for Windows audio capture.\n` +
                        `Make sure ffmpeg is installed and on your PATH.\n` +
                        `Error: ${err.message}\n\n` +
                        `Install: winget install ffmpeg`));
                });
                if (!proc.stdout) {
                    reject(new Error("ffmpeg stdout not available"));
                    return;
                }
                proc.stdout.on("data", (chunk) => {
                    buffer = Buffer.concat([buffer, chunk]);
                    while (buffer.length >= bytesPerFrame) {
                        const frameBuffer = buffer.slice(0, bytesPerFrame);
                        buffer = buffer.slice(bytesPerFrame);
                        const fa = new Float32Array(frameBuffer.buffer, frameBuffer.byteOffset, frameSize * NUM_CHANNELS);
                        for (const cb of listeners)
                            cb(fa);
                    }
                });
                proc.on("spawn", () => resolve());
            });
        },
        async stop() {
            if (proc) {
                proc.kill("SIGTERM");
                proc = null;
            }
            buffer = Buffer.alloc(0);
        },
    };
}
//# sourceMappingURL=windows.js.map
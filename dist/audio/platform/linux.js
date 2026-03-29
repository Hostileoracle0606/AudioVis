"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLinuxAudioSource = createLinuxAudioSource;
const child_process_1 = require("child_process");
function findMonitorSourceSync() {
    // Return a best-guess default monitor source name.
    // On most PulseAudio systems the default monitor is
    // "<default_sink_name>.monitor".
    // We try pactl to discover it; fall back to "default.monitor".
    try {
        const { execSync } = require("child_process");
        const out = execSync("pactl get-default-sink", { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
        if (out)
            return `${out}.monitor`;
    }
    catch {
        // pactl not available or failed
    }
    return "default.monitor";
}
function createLinuxAudioSource(opts) {
    const { sampleRate, frameSize } = opts;
    const device = opts.deviceName ?? findMonitorSourceSync();
    let proc = null;
    const listeners = [];
    let buffer = Buffer.alloc(0);
    const bytesPerFrame = frameSize * 4; // f32le = 4 bytes
    return {
        getInfo() {
            return { platform: "linux", device, sampleRate, frameSize };
        },
        onFrame(cb) {
            listeners.push(cb);
        },
        async start() {
            return new Promise((resolve, reject) => {
                // Try parecord first; fall back to pw-record.
                const args = [
                    `--device=${device}`,
                    "--raw",
                    "--format=float32le",
                    `--rate=${sampleRate}`,
                    "--channels=1",
                    "--latency-msec=50",
                ];
                proc = (0, child_process_1.spawn)("parecord", args, { stdio: ["ignore", "pipe", "pipe"] });
                proc.on("error", (err) => {
                    // parecord not found; try pw-record
                    proc = (0, child_process_1.spawn)("pw-record", [
                        "--target", device,
                        "--format", "f32",
                        `--rate=${sampleRate}`,
                        "--channels=1",
                        "-",
                    ], { stdio: ["ignore", "pipe", "pipe"] });
                    proc.on("error", (err2) => {
                        reject(new Error(`Could not start audio capture on Linux.\n` +
                            `Tried 'parecord' and 'pw-record', both failed.\n` +
                            `Install PulseAudio (parecord) or PipeWire (pw-record).\n` +
                            `parecord error: ${err.message}\n` +
                            `pw-record error: ${err2.message}`));
                    });
                    setupPipeHandlers(resolve);
                });
                setupPipeHandlers(resolve);
                function setupPipeHandlers(onReady) {
                    if (!proc || !proc.stdout)
                        return;
                    proc.stdout.on("data", (chunk) => {
                        buffer = Buffer.concat([buffer, chunk]);
                        while (buffer.length >= bytesPerFrame) {
                            const frameBuffer = buffer.slice(0, bytesPerFrame);
                            buffer = buffer.slice(bytesPerFrame);
                            const fa = new Float32Array(frameBuffer.buffer, frameBuffer.byteOffset, frameSize);
                            for (const cb of listeners)
                                cb(fa);
                        }
                    });
                    proc.stderr?.on("data", () => {
                        // Suppress stderr noise from parecord/pw-record
                    });
                    proc.on("spawn", () => onReady());
                }
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
//# sourceMappingURL=linux.js.map
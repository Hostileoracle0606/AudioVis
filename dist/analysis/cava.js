"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CavaAnalysisSource = void 0;
exports.decodeCava8BitFrame = decodeCava8BitFrame;
exports.deriveLevelsFromBars = deriveLevelsFromBars;
exports.buildCavaConfig = buildCavaConfig;
exports.resolveCavaBinary = resolveCavaBinary;
exports.getCavaAvailability = getCavaAvailability;
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
function clamp01(value) {
    return Math.max(0, Math.min(1, value));
}
function decodeCava8BitFrame(frame, barCount) {
    const bars = new Float32Array(barCount);
    for (let i = 0; i < barCount; i++) {
        bars[i] = clamp01((frame[i] ?? 0) / 255);
    }
    return bars;
}
function deriveLevelsFromBars(bars, previousAmplitude = 0) {
    if (bars.length === 0) {
        return { low: 0, mid: 0, high: 0, amplitude: 0, pulse: 0 };
    }
    const groupSize = Math.max(1, Math.floor(bars.length / 3));
    const averageRange = (start, end) => {
        let sum = 0;
        let count = 0;
        for (let i = start; i < end && i < bars.length; i++) {
            sum += bars[i];
            count += 1;
        }
        return count === 0 ? 0 : sum / count;
    };
    let sum = 0;
    let peak = 0;
    for (const bar of bars) {
        sum += bar;
        peak = Math.max(peak, bar);
    }
    const amplitude = sum / bars.length;
    const low = averageRange(0, groupSize);
    const mid = averageRange(groupSize, groupSize * 2);
    const high = averageRange(groupSize * 2, bars.length);
    const pulse = clamp01((amplitude - previousAmplitude) * 4 + Math.max(0, peak - amplitude) * 0.35);
    return { low, mid, high, amplitude, pulse };
}
function quoteConfigValue(value) {
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
function buildCavaConfig(options) {
    return [
        "[general]",
        `bars = ${options.bars}`,
        `framerate = ${options.fps}`,
        "autosens = 1",
        "",
        "[input]",
        "method = portaudio",
        `source = ${quoteConfigValue(options.sourceName)}`,
        "channels = mono",
        "",
        "[output]",
        "method = raw",
        "raw_target = /dev/stdout",
        "data_format = binary",
        "bit_format = 8bit",
        "channels = mono",
        "",
    ].join("\n");
}
function findExecutableOnPath(command) {
    const result = (0, child_process_1.spawnSync)("sh", ["-lc", `command -v ${command}`], {
        encoding: "utf8",
    });
    if (result.status !== 0) {
        return null;
    }
    const candidate = (result.stdout ?? "").trim();
    return candidate && fs_1.default.existsSync(candidate) ? candidate : null;
}
function resolveCavaBinary(config) {
    const candidates = [
        process.env.AUDIO_VIS_CAVA_PATH,
        config?.runtime?.analyzerBinaryPath,
        "/opt/homebrew/bin/cava",
        "/usr/local/bin/cava",
        findExecutableOnPath("cava"),
    ].filter(Boolean);
    for (const candidate of candidates) {
        if (candidate && fs_1.default.existsSync(candidate)) {
            return candidate;
        }
    }
    return null;
}
function getCavaAvailability(config) {
    if (process.platform !== "darwin") {
        return {
            available: false,
            message: "The cava analyzer backend is only configured for macOS in this build.",
        };
    }
    const binaryPath = resolveCavaBinary(config);
    if (!binaryPath) {
        return {
            available: false,
            message: "cava is not available. Install it with `brew install cava` or set AUDIO_VIS_CAVA_PATH.",
        };
    }
    return {
        available: true,
        path: binaryPath,
    };
}
class CavaAnalysisSource {
    options;
    binaryPath;
    listeners = [];
    proc = null;
    buffer = Buffer.alloc(0);
    previousAmplitude = 0;
    tempDir = null;
    constructor(options) {
        const availability = getCavaAvailability({
            runtime: { analyzerBinaryPath: options.binaryPath },
        });
        if (!availability.available || !availability.path) {
            throw new Error(availability.message || "cava is unavailable.");
        }
        this.options = options;
        this.binaryPath = availability.path;
    }
    getInfo() {
        return {
            source: this.options.sourceName,
            bars: this.options.bars,
            fps: this.options.fps,
            backend: "cava",
        };
    }
    onFrame(cb) {
        this.listeners.push(cb);
    }
    async start() {
        const configContent = buildCavaConfig(this.options);
        this.tempDir = fs_1.default.mkdtempSync(path_1.default.join(os_1.default.tmpdir(), "audio-vis-cava-"));
        const configPath = path_1.default.join(this.tempDir, "config");
        fs_1.default.writeFileSync(configPath, configContent, "utf8");
        await new Promise((resolve, reject) => {
            let settled = false;
            let stderr = "";
            this.proc = (0, child_process_1.spawn)(this.binaryPath, ["-p", configPath], {
                stdio: ["ignore", "pipe", "pipe"],
            });
            const fail = (message) => {
                if (settled)
                    return;
                settled = true;
                reject(new Error(message));
            };
            this.proc.on("error", (err) => {
                fail(`Failed to start cava: ${err.message}`);
            });
            this.proc.stderr?.on("data", (chunk) => {
                stderr += chunk.toString("utf8");
            });
            this.proc.stdout?.on("data", (chunk) => {
                this.buffer = Buffer.concat([this.buffer, chunk]);
                while (this.buffer.length >= this.options.bars) {
                    const frameBuffer = this.buffer.subarray(0, this.options.bars);
                    this.buffer = this.buffer.subarray(this.options.bars);
                    const bars = decodeCava8BitFrame(frameBuffer, this.options.bars);
                    const levels = deriveLevelsFromBars(bars, this.previousAmplitude);
                    this.previousAmplitude = levels.amplitude;
                    const frame = { bars, ...levels };
                    for (const cb of this.listeners)
                        cb(frame);
                }
            });
            this.proc.on("exit", (code, signal) => {
                if (!settled) {
                    const detail = stderr.trim();
                    fail(`cava exited before producing frames (code=${code ?? "null"}, signal=${signal ?? "null"}).${detail ? ` ${detail}` : ""}`);
                }
            });
            this.proc.on("spawn", () => {
                setTimeout(() => {
                    if (settled)
                        return;
                    settled = true;
                    resolve();
                }, 150);
            });
        });
    }
    async stop() {
        if (this.proc) {
            this.proc.kill("SIGTERM");
            this.proc = null;
        }
        this.buffer = Buffer.alloc(0);
        this.previousAmplitude = 0;
        if (this.tempDir) {
            fs_1.default.rmSync(this.tempDir, { recursive: true, force: true });
            this.tempDir = null;
        }
    }
}
exports.CavaAnalysisSource = CavaAnalysisSource;
//# sourceMappingURL=cava.js.map
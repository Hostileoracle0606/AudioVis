"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runVisualizer = runVisualizer;
exports.registerVisualizer = registerVisualizer;
const createAudioSource_js_1 = require("../../audio/createAudioSource.js");
const engine_js_1 = require("../../visualizer/engine.js");
const cleanup_js_1 = require("../../utils/cleanup.js");
const errors_js_1 = require("../../utils/errors.js");
const store_js_1 = require("../../config/store.js");
const picocolors_1 = __importDefault(require("picocolors"));
async function runVisualizer(opts) {
    const config = (0, store_js_1.loadConfig)();
    const mode = (opts.mode === "spectrum" ? "spectrum" :
        opts.mode === "scroll" ? "scroll" : "wavefield");
    const numBars = Math.max(4, Math.min(128, parseInt(opts.bars, 10) || 32));
    const fps = Math.max(5, Math.min(60, parseInt(opts.fps, 10) || 30));
    const sampleRate = parseInt(opts.sampleRate, 10) || 44100;
    const fftSize = parseInt(opts.fftSize, 10) || 2048;
    const audioDevice = opts.audioDevice ??
        (process.platform === "darwin" ? config.audio?.macosDeviceName : undefined);
    (0, cleanup_js_1.installCleanupHandlers)();
    let audioSource;
    try {
        audioSource = (0, createAudioSource_js_1.createAudioSource)({
            sampleRate,
            frameSize: fftSize,
            deviceName: audioDevice,
            silent: opts.silent,
        });
    }
    catch (err) {
        (0, errors_js_1.fatalError)("Failed to create audio source", err);
    }
    console.log(picocolors_1.default.dim(`Platform: ${process.platform}`));
    const info = audioSource.getInfo();
    console.log(picocolors_1.default.dim(`Audio device: ${info.device}`));
    console.log(picocolors_1.default.dim(`Sample rate: ${sampleRate} Hz  FFT size: ${fftSize}`));
    console.log(picocolors_1.default.dim("Starting visualizer... (press q to quit)\n"));
    await new Promise((r) => setTimeout(r, 600));
    const engine = new engine_js_1.VisualizerEngine(audioSource, {
        mode,
        numBars,
        fps,
        sampleRate,
        asciiSafe: opts.asciiSafe,
        noColor: !opts.noColor,
    });
    try {
        await engine.start();
        await new Promise(() => {
            // The engine's quit action will call process.exit()
        });
    }
    catch (err) {
        (0, errors_js_1.fatalError)("Visualizer error", err);
    }
}
function registerVisualizer(program) {
    program
        .command("visualizer")
        .description("Start the full-screen ASCII music visualizer")
        .option("--mode <wavefield|scroll|spectrum>", "Visualization mode", "wavefield")
        .option("--bars <n>", "Number of spectrum bars", "32")
        .option("--fps <n>", "Target frames per second", "30")
        .option("--audio-device <name>", "Audio capture device name or ID")
        .option("--sample-rate <n>", "Audio sample rate (Hz)", "44100")
        .option("--fft-size <n>", "FFT frame size (power of 2)", "2048")
        .option("--ascii-safe", "Use ASCII-only characters", false)
        .option("--no-color", "Disable ANSI color", false)
        .option("--silent", "Skip audio capture; emit silence (useful without BlackHole)", false)
        .action(async (opts) => {
        await runVisualizer(opts);
    });
}
//# sourceMappingURL=visualizer.js.map
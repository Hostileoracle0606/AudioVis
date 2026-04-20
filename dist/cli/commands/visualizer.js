"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runVisualizer = runVisualizer;
exports.registerVisualizer = registerVisualizer;
const createAudioSource_js_1 = require("../../audio/createAudioSource.js");
const App_js_1 = require("../../player/App.js");
const cleanup_js_1 = require("../../utils/cleanup.js");
const errors_js_1 = require("../../utils/errors.js");
const store_js_1 = require("../../config/store.js");
const picocolors_1 = __importDefault(require("picocolors"));
async function runVisualizer(opts) {
    const config = (0, store_js_1.loadConfig)();
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
    console.log(picocolors_1.default.dim("Starting TUI.AMP v4.0... (press q to quit)\n"));
    await new Promise((r) => setTimeout(r, 600));
    const app = new App_js_1.App({ audio: audioSource, noColor: opts.noColor });
    try {
        await app.start();
        await new Promise(() => {
            // App's quit action calls process.exit()
        });
    }
    catch (err) {
        (0, errors_js_1.fatalError)("Visualizer error", err);
    }
}
function registerVisualizer(program) {
    program
        .command("visualizer")
        .description("Start the TUI.AMP v4.0 fixed-grid player")
        .option("--audio-device <name>", "Audio capture device name or ID")
        .option("--sample-rate <n>", "Audio sample rate (Hz)", "44100")
        .option("--fft-size <n>", "FFT frame size (power of 2)", "2048")
        .option("--no-color", "Disable ANSI color", false)
        .option("--silent", "Skip audio capture; emit silence (useful without BlackHole)", false)
        .action(async (opts) => {
        await runVisualizer(opts);
    });
}
//# sourceMappingURL=visualizer.js.map
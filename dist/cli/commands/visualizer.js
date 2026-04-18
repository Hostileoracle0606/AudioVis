"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runVisualizer = runVisualizer;
exports.registerVisualizer = registerVisualizer;
const factory_js_1 = require("../../analysis/factory.js");
const store_js_1 = require("../../config/store.js");
const factory_js_2 = require("../../player/factory.js");
const engine_js_1 = require("../../visualizer/engine.js");
const cleanup_js_1 = require("../../utils/cleanup.js");
const errors_js_1 = require("../../utils/errors.js");
const state_js_1 = require("../../visualizer/state.js");
const index_js_1 = require("../../visualizer/modes/index.js");
const picocolors_1 = __importDefault(require("picocolors"));
async function runVisualizer(opts) {
    const config = (0, store_js_1.loadConfig)();
    const mode = ((0, index_js_1.isVisualizerMode)(opts.mode) ? opts.mode : "wavefield");
    const numBars = Math.max(4, Math.min(128, parseInt(opts.bars, 10) || 32));
    const fps = Math.max(5, Math.min(60, parseInt(opts.fps, 10) || 30));
    const audioDevice = opts.audioDevice ??
        config.runtime?.analyzerSource ??
        (process.platform === "darwin" ? config.audio?.macosDeviceName : undefined);
    (0, cleanup_js_1.installCleanupHandlers)();
    let playerBackend;
    let analysisSource;
    try {
        playerBackend = await (0, factory_js_2.requirePlayerBackend)(config);
        analysisSource = (0, factory_js_1.createAnalysisSource)(config, {
            bars: numBars,
            fps,
            sourceName: audioDevice,
            silent: opts.silent,
        });
    }
    catch (err) {
        (0, errors_js_1.fatalError)("Failed to initialize runtime", err);
    }
    console.log(picocolors_1.default.dim(`Platform: ${process.platform}`));
    const info = analysisSource.getInfo();
    console.log(picocolors_1.default.dim(`Player backend: Spotify Desktop`));
    console.log(picocolors_1.default.dim(`Analyzer: ${info.backend}`));
    console.log(picocolors_1.default.dim(`Audio source: ${info.source}`));
    console.log(picocolors_1.default.dim("Starting visualizer... (press q to quit)\n"));
    await new Promise((r) => setTimeout(r, 600));
    const engine = new engine_js_1.VisualizerEngine(playerBackend, analysisSource, {
        mode,
        numBars,
        fps,
        asciiSafe: opts.asciiSafe,
        noColor: opts.noColor,
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
        .option(`--mode <${state_js_1.VIS_MODE_IDS.join("|")}>`, "Visualization mode", "wavefield")
        .option("--bars <n>", "Number of spectrum bars", "32")
        .option("--fps <n>", "Target frames per second", "30")
        .option("--audio-device <name>", "Loopback analyzer source name")
        .option("--sample-rate <n>", "Legacy option (ignored in desktop backend)", "44100")
        .option("--fft-size <n>", "Legacy option (ignored in desktop backend)", "2048")
        .option("--ascii-safe", "Use ASCII-only characters", false)
        .option("--no-color", "Disable ANSI color", false)
        .option("--silent", "Skip audio analysis; emit silence for UI testing", false)
        .action(async (opts) => {
        await runVisualizer(opts);
    });
}
//# sourceMappingURL=visualizer.js.map
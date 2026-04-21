"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerLaunch = registerLaunch;
const picocolors_1 = __importDefault(require("picocolors"));
const store_js_1 = require("../../config/store.js");
const setup_js_1 = require("../../macos/setup.js");
const errors_js_1 = require("../../utils/errors.js");
const visualizer_js_1 = require("./visualizer.js");
function registerLaunch(program) {
    program
        .command("launch")
        .description("Prepare the app, then launch the visualizer")
        .option("--mode <player|wavefield|scroll|spectrum|album-art>", "Visualization mode", "wavefield")
        .option("--bars <n>", "Number of spectrum bars", "32")
        .option("--fps <n>", "Target frames per second", "30")
        .option("--sample-rate <n>", "Audio sample rate (Hz)", "44100")
        .option("--fft-size <n>", "FFT frame size (power of 2)", "2048")
        .option("--ascii-safe", "Use ASCII-only characters", false)
        .option("--no-color", "Disable ANSI color", false)
        .option("--app", "Marks that the command is running from the macOS app bundle")
        .action(async (opts) => {
        try {
            let audioDevice = (0, store_js_1.loadConfig)().audio?.macosDeviceName;
            if (process.platform === "darwin") {
                const result = await (0, setup_js_1.ensureMacosReady)();
                audioDevice = result.deviceName;
                console.log(picocolors_1.default.dim(`Spotify Desktop detected.`));
            }
            await (0, visualizer_js_1.runVisualizer)({
                ...opts,
                audioDevice,
                silent: false,
            });
        }
        catch (err) {
            (0, errors_js_1.fatalError)("Launch failed", err);
        }
    });
}
//# sourceMappingURL=launch.js.map
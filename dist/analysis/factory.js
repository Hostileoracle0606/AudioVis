"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAnalysisSource = createAnalysisSource;
const cava_js_1 = require("./cava.js");
const silent_js_1 = require("./silent.js");
function createAnalysisSource(config, options) {
    if (options.silent) {
        return (0, silent_js_1.createSilentAnalysisSource)(options.bars, options.fps);
    }
    const sourceName = options.sourceName ??
        config.runtime?.analyzerSource ??
        config.audio?.macosDeviceName;
    if (!sourceName) {
        throw new Error("No analyzer source is configured. Run `myviz setup` or pass `--audio-device`.");
    }
    return new cava_js_1.CavaAnalysisSource({
        bars: options.bars,
        fps: options.fps,
        sourceName,
        binaryPath: options.binaryPath ?? config.runtime?.analyzerBinaryPath,
    });
}
//# sourceMappingURL=factory.js.map
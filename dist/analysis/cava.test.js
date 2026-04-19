"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const cava_js_1 = require("./cava.js");
(0, node_test_1.default)("decodeCava8BitFrame normalizes byte values", () => {
    const frame = (0, cava_js_1.decodeCava8BitFrame)(Buffer.from([0, 128, 255]), 3);
    strict_1.default.equal(frame[0], 0);
    strict_1.default.ok(frame[1] > 0.49 && frame[1] < 0.51);
    strict_1.default.equal(frame[2], 1);
});
(0, node_test_1.default)("deriveLevelsFromBars reports silence cleanly", () => {
    const levels = (0, cava_js_1.deriveLevelsFromBars)(new Float32Array([0, 0, 0, 0]), 0);
    strict_1.default.deepEqual(levels, {
        low: 0,
        mid: 0,
        high: 0,
        amplitude: 0,
        pulse: 0,
    });
});
(0, node_test_1.default)("deriveLevelsFromBars detects a rising pulse", () => {
    const bars = new Float32Array([0.2, 0.4, 0.8, 1]);
    const levels = (0, cava_js_1.deriveLevelsFromBars)(bars, 0.1);
    strict_1.default.ok(levels.amplitude > 0.5);
    strict_1.default.ok(levels.pulse > 0.5);
});
(0, node_test_1.default)("buildCavaConfig includes raw binary output", () => {
    const config = (0, cava_js_1.buildCavaConfig)({
        bars: 32,
        fps: 30,
        sourceName: "BlackHole 2ch",
    });
    strict_1.default.match(config, /\[output\]/);
    strict_1.default.match(config, /method = raw/);
    strict_1.default.match(config, /data_format = binary/);
    strict_1.default.match(config, /bit_format = 8bit/);
});
//# sourceMappingURL=cava.test.js.map
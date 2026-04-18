"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const renderer_js_1 = require("../../ui/renderer.js");
const theme_js_1 = require("../../ui/theme.js");
const state_js_1 = require("../state.js");
const index_js_1 = require("./index.js");
const skyline_js_1 = require("./skyline.js");
(0, node_test_1.default)("visualizer mode registry includes skyline", () => {
    strict_1.default.equal((0, index_js_1.isVisualizerMode)("skyline"), true);
    strict_1.default.equal((0, index_js_1.getVisualizerMode)("skyline").label, "Skyline");
    strict_1.default.deepEqual(index_js_1.VISUALIZER_MODE_ORDER, ["wavefield", "scroll", "spectrum", "skyline"]);
});
(0, node_test_1.default)("renderSkyline produces ASCII buildings above the baseline", () => {
    const state = (0, state_js_1.createInitialState)("skyline", 8, 32, 14);
    state.smoothedBuckets = new Float32Array([0.2, 0.55, 0.75, 0.35, 0.9, 0.45, 0.6, 0.25]);
    state.low = 0.65;
    state.mid = 0.5;
    state.high = 0.7;
    state.amplitude = 0.72;
    state.pulse = 0.4;
    const renderer = new renderer_js_1.Renderer(32, 12);
    const theme = (0, theme_js_1.buildTheme)(true, false, state.styleProfile);
    const originalNow = Date.now;
    Date.now = () => state.startTime + 1200;
    try {
        (0, skyline_js_1.renderSkyline)(state, renderer, { x: 0, y: 0, width: 32, height: 12 }, theme);
    }
    finally {
        Date.now = originalNow;
    }
    const frame = renderer.toFrameString().replace("\x1b[H", "");
    strict_1.default.match(frame, /_/);
    strict_1.default.match(frame, /\|/);
    strict_1.default.match(frame, /#/);
});
//# sourceMappingURL=index.test.js.map
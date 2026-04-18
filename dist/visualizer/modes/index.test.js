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
const fire_js_1 = require("./fire.js");
const skyline_js_1 = require("./skyline.js");
const tunnel_js_1 = require("./tunnel.js");
(0, node_test_1.default)("visualizer mode registry includes skyline, fire, and tunnel", () => {
    strict_1.default.equal((0, index_js_1.isVisualizerMode)("skyline"), true);
    strict_1.default.equal((0, index_js_1.isVisualizerMode)("fire"), true);
    strict_1.default.equal((0, index_js_1.isVisualizerMode)("tunnel"), true);
    strict_1.default.equal((0, index_js_1.getVisualizerMode)("skyline").label, "Skyline");
    strict_1.default.equal((0, index_js_1.getVisualizerMode)("fire").label, "Fire");
    strict_1.default.equal((0, index_js_1.getVisualizerMode)("tunnel").label, "Tunnel");
    strict_1.default.deepEqual(index_js_1.VISUALIZER_MODE_ORDER, [
        "wavefield",
        "scroll",
        "spectrum",
        "skyline",
        "fire",
        "tunnel",
    ]);
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
(0, node_test_1.default)("fire mode renders hot ASCII cells", () => {
    const state = (0, state_js_1.createInitialState)("fire", 10, 20, 10);
    state.smoothedBuckets = new Float32Array([0.6, 0.72, 0.8, 0.9, 0.68, 0.74, 0.84, 0.7, 0.62, 0.58]);
    state.low = 0.82;
    state.mid = 0.5;
    state.high = 0.66;
    state.amplitude = 0.88;
    state.pulse = 0.54;
    const renderer = new renderer_js_1.Renderer(20, 10);
    const theme = (0, theme_js_1.buildTheme)(true, false, state.styleProfile);
    const originalNow = Date.now;
    Date.now = () => state.startTime + 960;
    try {
        (0, fire_js_1.prepareFire)(state, { x: 0, y: 0, width: 20, height: 10 });
        (0, fire_js_1.renderFire)(state, renderer, { x: 0, y: 0, width: 20, height: 10 }, theme);
    }
    finally {
        Date.now = originalNow;
    }
    const frame = renderer.toFrameString().replace("\x1b[H", "");
    strict_1.default.match(frame, /[@%#x:]/);
});
(0, node_test_1.default)("tunnel mode renders framed depth rings", () => {
    const state = (0, state_js_1.createInitialState)("tunnel", 12, 24, 12);
    state.low = 0.7;
    state.mid = 0.55;
    state.high = 0.62;
    state.amplitude = 0.78;
    state.pulse = 0.4;
    const renderer = new renderer_js_1.Renderer(24, 12);
    const theme = (0, theme_js_1.buildTheme)(true, false, state.styleProfile);
    const originalNow = Date.now;
    Date.now = () => state.startTime + 1500;
    try {
        (0, tunnel_js_1.prepareTunnel)(state, { x: 0, y: 0, width: 24, height: 12 });
        (0, tunnel_js_1.renderTunnel)(state, renderer, { x: 0, y: 0, width: 24, height: 12 }, theme);
    }
    finally {
        Date.now = originalNow;
    }
    const frame = renderer.toFrameString().replace("\x1b[H", "");
    strict_1.default.match(frame, /[\/\\]/);
    strict_1.default.match(frame, /[|\-]/);
});
//# sourceMappingURL=index.test.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const renderer_js_1 = require("../../ui/renderer.js");
const spectrum_js_1 = require("./spectrum.js");
const state_js_1 = require("../state.js");
const theme_js_1 = require("../theme.js");
(0, node_test_1.default)("spectrum renders label", () => {
    const r = new renderer_js_1.Renderer(60, 20);
    const s = (0, state_js_1.createInitialState)(60, 20);
    (0, spectrum_js_1.renderSpectrum)(r, { x: 0, y: 0, width: 60, height: 20 }, s, (0, theme_js_1.buildTheme)(0, true));
    node_assert_1.default.ok(r.debugLines().join("\n").includes("SPECTRUM ANALYZER"));
});
(0, node_test_1.default)("spectrum draws full bar for magnitude 1.0 and empty for 0.0", () => {
    const r = new renderer_js_1.Renderer(60, 20);
    const s = (0, state_js_1.createInitialState)(60, 20);
    s.spectrum = new Float32Array(16);
    s.spectrum[0] = 1.0;
    (0, spectrum_js_1.renderSpectrum)(r, { x: 0, y: 0, width: 60, height: 20 }, s, (0, theme_js_1.buildTheme)(0, true));
    const lines = r.debugLines();
    const bottom = lines[17];
    node_assert_1.default.ok(bottom.includes("\u2588"), "expected at least one full-block glyph on filled bar row");
});
//# sourceMappingURL=spectrum.test.js.map
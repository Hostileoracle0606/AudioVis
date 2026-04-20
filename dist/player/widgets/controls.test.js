"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const renderer_js_1 = require("../../ui/renderer.js");
const controls_js_1 = require("./controls.js");
const state_js_1 = require("../state.js");
const theme_js_1 = require("../theme.js");
const layout_js_1 = require("../layout.js");
(0, node_test_1.default)("controls renders timestamps and scrubber", () => {
    const r = new renderer_js_1.Renderer(120, 40);
    const s = (0, state_js_1.createInitialState)(120, 40);
    s.progressMs = 74_000;
    s.durationMs = 242_000;
    const L = (0, layout_js_1.computeAppLayout)(120, 40);
    (0, controls_js_1.renderControls)(r, L, s, (0, theme_js_1.buildTheme)(0, true));
    const lines = r.debugLines();
    node_assert_1.default.match(lines[L.scrubR.y], /01:14/);
    node_assert_1.default.match(lines[L.scrubR.y], /04:02/);
});
(0, node_test_1.default)("controls renders hotkey legend", () => {
    const r = new renderer_js_1.Renderer(120, 40);
    const s = (0, state_js_1.createInitialState)(120, 40);
    const L = (0, layout_js_1.computeAppLayout)(120, 40);
    (0, controls_js_1.renderControls)(r, L, s, (0, theme_js_1.buildTheme)(0, true));
    const line = r.debugLines()[L.keysR.y];
    node_assert_1.default.match(line, /\[p\] Play/);
    node_assert_1.default.match(line, /\[n\] Next/);
    node_assert_1.default.match(line, /\[q\] Quit/);
});
//# sourceMappingURL=controls.test.js.map
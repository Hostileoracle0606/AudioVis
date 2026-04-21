"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const renderer_js_1 = require("../../ui/renderer.js");
const titleBar_js_1 = require("./titleBar.js");
const layout_js_1 = require("../layout.js");
const state_js_1 = require("../state.js");
const theme_js_1 = require("../theme.js");
(0, node_test_1.default)("titleBar shows TUI·AMP brand", () => {
    const r = new renderer_js_1.Renderer(120, 30);
    const s = (0, state_js_1.createInitialState)(120, 30);
    const L = (0, layout_js_1.computeAppLayout)(120, 30);
    (0, titleBar_js_1.renderTitleBar)(r, L, s, (0, theme_js_1.buildTheme)(0, true), new Set());
    node_assert_1.default.match(r.debugLines().join("\n"), /TUI\u00B7AMP/);
});
(0, node_test_1.default)("titleBar shows sys load with cpu + rms readouts", () => {
    const r = new renderer_js_1.Renderer(120, 30);
    const s = (0, state_js_1.createInitialState)(120, 30);
    s.cpuPct = 19.7;
    s.rms = 0.73;
    const L = (0, layout_js_1.computeAppLayout)(120, 30);
    (0, titleBar_js_1.renderTitleBar)(r, L, s, (0, theme_js_1.buildTheme)(0, true), new Set());
    const all = r.debugLines().join("\n");
    node_assert_1.default.match(all, /cpu\u00B7\s*19\.7/);
    node_assert_1.default.match(all, /rms\u00B7\s*0\.73/);
});
(0, node_test_1.default)("sync LED uses accent when sync in accent set", () => {
    const r = new renderer_js_1.Renderer(120, 30);
    const s = (0, state_js_1.createInitialState)(120, 30);
    const L = (0, layout_js_1.computeAppLayout)(120, 30);
    const theme = (0, theme_js_1.buildTheme)(0, false);
    (0, titleBar_js_1.renderTitleBar)(r, L, s, theme, new Set(["sync"]));
    const raw = r.cells.join("");
    node_assert_1.default.ok(raw.includes(theme.accent));
});
(0, node_test_1.default)("titleBar shows the hotkey legend in the former search slot", () => {
    const r = new renderer_js_1.Renderer(120, 30);
    const s = (0, state_js_1.createInitialState)(120, 30);
    const L = (0, layout_js_1.computeAppLayout)(120, 30);
    (0, titleBar_js_1.renderTitleBar)(r, L, s, (0, theme_js_1.buildTheme)(0, true), new Set());
    const all = r.debugLines().join("\n");
    node_assert_1.default.match(all, /\[p\]lay/);
    node_assert_1.default.match(all, /\[q\]uit/);
    // Search hint must NOT appear — search has been removed.
    node_assert_1.default.ok(!/to search/.test(all), "search hint should be gone");
});
//# sourceMappingURL=titleBar.test.js.map
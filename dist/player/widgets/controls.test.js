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
(0, node_test_1.default)("progress row shows elapsed / total timestamps", () => {
    const r = new renderer_js_1.Renderer(120, 30);
    const s = (0, state_js_1.createInitialState)(120, 30);
    s.progressMs = 92_000;
    s.durationMs = 182_000;
    const L = (0, layout_js_1.computeAppLayout)(120, 30);
    (0, controls_js_1.renderControls)(r, L, s, (0, theme_js_1.buildTheme)(0, true));
    const all = r.debugLines().join("\n");
    node_assert_1.default.ok(all.includes("01:32"));
    node_assert_1.default.ok(all.includes("03:02"));
});
(0, node_test_1.default)("progress row uses greyscale shade ramp (░▒▓█) with grey SGR codes", () => {
    const r = new renderer_js_1.Renderer(120, 30);
    const s = (0, state_js_1.createInitialState)(120, 30);
    s.progressMs = 60_000;
    s.durationMs = 120_000;
    const L = (0, layout_js_1.computeAppLayout)(120, 30);
    (0, controls_js_1.renderControls)(r, L, s, (0, theme_js_1.buildTheme)(0, true));
    const all = r.debugLines().join("\n");
    // At least one shade-ramp glyph must appear in the played portion.
    node_assert_1.default.ok(/[\u2591\u2592\u2593\u2588]/.test(all), "expected ░▒▓█ shade glyph in progress row");
    // At least one greyscale SGR from the ramp must appear.
    const raw = r.cells.join("");
    const greyCodes = ["38;5;238", "38;5;242", "38;5;246", "38;5;250", "38;5;253"];
    const matched = greyCodes.filter((c) => raw.includes(c));
    node_assert_1.default.ok(matched.length > 0, `expected ≥1 greyscale SGR, found none from ${greyCodes.join(",")}`);
});
(0, node_test_1.default)("key legend row contains core hotkeys", () => {
    const r = new renderer_js_1.Renderer(120, 30);
    const s = (0, state_js_1.createInitialState)(120, 30);
    const L = (0, layout_js_1.computeAppLayout)(120, 30);
    (0, controls_js_1.renderControls)(r, L, s, (0, theme_js_1.buildTheme)(0, true));
    const all = r.debugLines().join("\n");
    // Key legend now lives in the title bar, not the controls row.
    node_assert_1.default.ok(!/\[p\]lay/.test(all), "legend should no longer appear in controls row");
});
(0, node_test_1.default)("LED chaser strip renders ●/· pattern", () => {
    const r = new renderer_js_1.Renderer(120, 30);
    const s = (0, state_js_1.createInitialState)(120, 30);
    s.ledChaserIndex = 5;
    s.isPlaying = true;
    const L = (0, layout_js_1.computeAppLayout)(120, 30);
    (0, controls_js_1.renderControls)(r, L, s, (0, theme_js_1.buildTheme)(0, true));
    const all = r.debugLines().join("\n");
    node_assert_1.default.ok(all.includes("\u25CF"), "expected ● in LED strip");
});
//# sourceMappingURL=controls.test.js.map
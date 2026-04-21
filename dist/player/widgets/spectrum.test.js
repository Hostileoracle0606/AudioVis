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
(0, node_test_1.default)("distributeSlots sums every slot width to plotW with no leftover cells", () => {
    // Caller guarantees plotW >= n (renderSpectrum clamps via Math.max(NUM_BARS, …)).
    for (const [plotW, n] of [[80, 16], [100, 16], [43, 16], [16, 16]]) {
        const slots = (0, spectrum_js_1.distributeSlots)(2, plotW, n);
        const sum = slots.reduce((a, s) => a + s.w, 0);
        node_assert_1.default.strictEqual(sum, plotW, `plotW=${plotW} n=${n} sum=${sum}`);
        node_assert_1.default.strictEqual(slots.length, n);
        for (let i = 1; i < slots.length; i++) {
            node_assert_1.default.strictEqual(slots[i].x, slots[i - 1].x + slots[i - 1].w, `gap at slot ${i}`);
        }
    }
});
(0, node_test_1.default)("reactiveMag boosts high-frequency bins via tilt", () => {
    const bass = (0, spectrum_js_1.reactiveMag)(0.3, 0, 16, false);
    const treble = (0, spectrum_js_1.reactiveMag)(0.3, 15, 16, false);
    node_assert_1.default.ok(treble > bass, `treble ${treble} should exceed bass ${bass} under tilt`);
});
(0, node_test_1.default)("reactiveMag clamps to [0,1] and never exceeds 1 under flash", () => {
    node_assert_1.default.strictEqual((0, spectrum_js_1.reactiveMag)(1, 15, 16, true), 1);
    node_assert_1.default.strictEqual((0, spectrum_js_1.reactiveMag)(-0.5, 0, 16, false), 0);
});
(0, node_test_1.default)("spectrum bars fill the full plot width (last bar touches right edge)", () => {
    const cols = 80;
    const r = new renderer_js_1.Renderer(cols, 14);
    const s = (0, state_js_1.createInitialState)(cols, 14);
    for (let i = 0; i < 16; i++)
        s.spectrum[i] = 1; // fully saturated so bars paint every column
    (0, spectrum_js_1.renderSpectrum)(r, { x: 0, y: 0, width: cols, height: 14 }, s, (0, theme_js_1.buildTheme)(0, true), new Set());
    const rows = r.debugLines();
    // Scan across all rows inside the plot region for any painted glyph at the
    // right-hand edge of the plot (col = width - 3).
    const rightEdge = cols - 3;
    let rightEdgePainted = false;
    for (let y = 2; y < 12; y++) {
        const ch = rows[y][rightEdge];
        if (ch && ch !== " ") {
            rightEdgePainted = true;
            break;
        }
    }
    node_assert_1.default.ok(rightEdgePainted, "no glyph reached the right edge of the plot area");
});
(0, node_test_1.default)("spectrum renders header with palette name and peak", () => {
    const r = new renderer_js_1.Renderer(80, 12);
    const s = (0, state_js_1.createInitialState)(80, 12);
    (0, spectrum_js_1.renderSpectrum)(r, { x: 0, y: 0, width: 80, height: 12 }, s, (0, theme_js_1.buildTheme)(0, true), new Set());
    const all = r.debugLines().join("\n");
    node_assert_1.default.match(all, /spectrum/i);
    node_assert_1.default.match(all, /amber|warm|AMBER/i);
});
(0, node_test_1.default)("spectrum shows Hz-label row", () => {
    const r = new renderer_js_1.Renderer(80, 12);
    const s = (0, state_js_1.createInitialState)(80, 12);
    (0, spectrum_js_1.renderSpectrum)(r, { x: 0, y: 0, width: 80, height: 12 }, s, (0, theme_js_1.buildTheme)(0, true), new Set());
    const all = r.debugLines().join("\n");
    node_assert_1.default.ok(all.includes("62") && all.includes("1k") && all.includes("8k"));
});
(0, node_test_1.default)("spectrum shows peak-hold ● row", () => {
    const r = new renderer_js_1.Renderer(80, 12);
    const s = (0, state_js_1.createInitialState)(80, 12);
    for (let i = 0; i < 16; i++)
        s.spectrum[i] = 0.5;
    (0, spectrum_js_1.renderSpectrum)(r, { x: 0, y: 0, width: 80, height: 12 }, s, (0, theme_js_1.buildTheme)(0, true), new Set());
    const all = r.debugLines().join("\n");
    node_assert_1.default.ok(all.includes("\u25CF"), "peak-hold ● row missing");
});
(0, node_test_1.default)("bass-bin accent applied when target set includes bass-bin", () => {
    const r = new renderer_js_1.Renderer(80, 12);
    const s = (0, state_js_1.createInitialState)(80, 12);
    s.spectrum[0] = 0.9;
    const theme = (0, theme_js_1.buildTheme)(0, false);
    (0, spectrum_js_1.renderSpectrum)(r, { x: 0, y: 0, width: 80, height: 12 }, s, theme, new Set(["bass-bin"]));
    const raw = r.cells.join("");
    // Bass emphasis uses the bright variant of the accent colour.
    node_assert_1.default.ok(raw.includes(theme.accentBright) || raw.includes(theme.accent), "no accent colour applied to bass bin");
});
//# sourceMappingURL=spectrum.test.js.map
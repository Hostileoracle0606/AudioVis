"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const renderer_js_1 = require("../../ui/renderer.js");
const queuePads_js_1 = require("./queuePads.js");
const state_js_1 = require("../state.js");
const theme_js_1 = require("../theme.js");
const REGION = { x: 0, y: 0, width: 40, height: 15 };
function setNowPlaying(s, trackName, artistName) {
    s.nowPlaying = {
        trackName, artistName,
        albumName: "a", albumArtUrl: "", deviceName: "s",
        isPlaying: true, progressMs: 0, durationMs: 0,
    };
}
(0, node_test_1.default)("renderQueuePads draws 8 pads with indices 01-08", () => {
    const r = new renderer_js_1.Renderer(40, 15);
    const s = (0, state_js_1.createInitialState)(40, 15);
    (0, queuePads_js_1.renderQueuePads)(r, REGION, s, (0, theme_js_1.buildTheme)(0, true));
    const all = r.debugLines().join("\n");
    for (let i = 1; i <= 8; i++) {
        node_assert_1.default.ok(all.includes(String(i).padStart(2, "0")), `missing pad index ${i}`);
    }
});
(0, node_test_1.default)("pads contain lit bulbs (●) driven by the beat sequencer", () => {
    const r = new renderer_js_1.Renderer(40, 15);
    const s = (0, state_js_1.createInitialState)(40, 15);
    setNowPlaying(s, "hello", "world");
    s.progressMs = 10_000;
    (0, queuePads_js_1.renderQueuePads)(r, REGION, s, (0, theme_js_1.buildTheme)(0, true));
    const all = r.debugLines().join("\n");
    node_assert_1.default.ok(all.includes("\u25CF"), "expected ≥1 lit bulb in the pad grid");
});
(0, node_test_1.default)("active step (derived from progressMs + bpm) uses the bright accent", () => {
    const r = new renderer_js_1.Renderer(40, 15);
    const s = (0, state_js_1.createInitialState)(40, 15);
    setNowPlaying(s, "hello", "world");
    s.progressMs = 60_000;
    const theme = (0, theme_js_1.buildTheme)(0, true);
    (0, queuePads_js_1.renderQueuePads)(r, REGION, s, theme);
    const raw = r.cells.join("");
    node_assert_1.default.ok(raw.includes(theme.accentBright), "active-step bright accent missing");
});
(0, node_test_1.default)("header shows the current step counter and bpm", () => {
    const r = new renderer_js_1.Renderer(40, 15);
    const s = (0, state_js_1.createInitialState)(40, 15);
    setNowPlaying(s, "hello", "world");
    s.progressMs = 0;
    (0, queuePads_js_1.renderQueuePads)(r, REGION, s, (0, theme_js_1.buildTheme)(0, true));
    const all = r.debugLines().join("\n");
    node_assert_1.default.match(all, /step\s+\d\d\/08/i);
    node_assert_1.default.match(all, /\d{2,3}bpm/i);
});
(0, node_test_1.default)("pads pulse during a recent transient (flashing frame uses the accent)", () => {
    const r = new renderer_js_1.Renderer(40, 15);
    const s = (0, state_js_1.createInitialState)(40, 15);
    setNowPlaying(s, "hello", "world");
    s.progressMs = 5000;
    s.lastTransientAt = Date.now(); // fresh hit
    const theme = (0, theme_js_1.buildTheme)(0, true);
    (0, queuePads_js_1.renderQueuePads)(r, REGION, s, theme);
    const raw = r.cells.join("");
    // Inactive pads get the accent on their frame during a flash window.
    node_assert_1.default.ok(raw.includes(theme.accent), "flashing frame accent missing");
});
//# sourceMappingURL=queuePads.test.js.map
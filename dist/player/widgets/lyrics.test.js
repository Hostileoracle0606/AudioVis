"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const renderer_js_1 = require("../../ui/renderer.js");
const lyrics_js_1 = require("./lyrics.js");
const state_js_1 = require("../state.js");
const theme_js_1 = require("../theme.js");
(0, node_test_1.default)("lyrics shows label and low-energy line as plain text", () => {
    const r = new renderer_js_1.Renderer(60, 20);
    const s = (0, state_js_1.createInitialState)(60, 20);
    s.lyrics = [{ timeMs: 0, text: "Do the dance" }, { timeMs: 5000, text: "Bounce" }];
    s.activeLyricIndex = 0;
    s.transientEnergy = 0.1;
    (0, lyrics_js_1.renderLyrics)(r, { x: 0, y: 0, width: 60, height: 16 }, s, (0, theme_js_1.buildTheme)(0, true));
    const joined = r.debugLines().join("\n");
    node_assert_1.default.match(joined, /KINETIC LYRICS/);
    node_assert_1.default.match(joined, /Do the dance/);
});
(0, node_test_1.default)("lyrics renders active line as big-font glyphs when energy > 0.6", () => {
    const r = new renderer_js_1.Renderer(60, 20);
    const s = (0, state_js_1.createInitialState)(60, 20);
    s.lyrics = [{ timeMs: 0, text: "BOUNCE" }];
    s.activeLyricIndex = 0;
    s.transientEnergy = 0.9;
    (0, lyrics_js_1.renderLyrics)(r, { x: 0, y: 0, width: 60, height: 16 }, s, (0, theme_js_1.buildTheme)(0, true));
    const joined = r.debugLines().join("\n");
    node_assert_1.default.ok(joined.includes("\u2588"), "expected block glyphs for FIGlet rendering");
    node_assert_1.default.match(joined, /TRANSIENT PEAK/);
});
//# sourceMappingURL=lyrics.test.js.map
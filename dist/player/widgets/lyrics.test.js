"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
(0, node_test_1.default)("lyrics panel shows header label", () => {
    const r = new renderer_js_1.Renderer(60, 10);
    const s = (0, state_js_1.createInitialState)(60, 10);
    (0, lyrics_js_1.renderLyrics)(r, { x: 0, y: 0, width: 60, height: 10 }, s, (0, theme_js_1.buildTheme)(0, true), new Set());
    node_assert_1.default.match(r.debugLines().join("\n"), /lyrics/);
});
(0, node_test_1.default)("active lyric renders in bitfont once progressMs reaches the line", () => {
    const r = new renderer_js_1.Renderer(60, 10);
    const s = (0, state_js_1.createInitialState)(60, 10);
    s.lyrics = [{ timeMs: 0, text: "HI" }, { timeMs: 1000, text: "HELLO" }];
    s.activeLyricIndex = 0;
    s.progressMs = 1000; // fully past line 0 — all chars revealed
    (0, lyrics_js_1.renderLyrics)(r, { x: 0, y: 0, width: 60, height: 10 }, s, (0, theme_js_1.buildTheme)(0, true), new Set());
    const all = r.debugLines().join("\n");
    node_assert_1.default.ok(/[\u2580\u2584\u2588]/.test(all), "expected half-block glyph");
});
(0, node_test_1.default)("no glyphs are rendered before the line's start time (accounting for the lead offset)", () => {
    const r = new renderer_js_1.Renderer(60, 10);
    const s = (0, state_js_1.createInitialState)(60, 10);
    s.lyrics = [{ timeMs: 2000, text: "HI" }, { timeMs: 3000, text: "YO" }];
    s.activeLyricIndex = 0;
    // The widget applies a +250ms lead. To be *before* the line's
    // effective start, progressMs must be <= lineStartMs - 250 - 1.
    s.progressMs = 1700;
    (0, lyrics_js_1.renderLyrics)(r, { x: 0, y: 0, width: 60, height: 10 }, s, (0, theme_js_1.buildTheme)(0, true), new Set());
    const all = r.debugLines().join("\n");
    node_assert_1.default.ok(!/[\u2580\u2584\u2588]/.test(all), "expected no glyphs when nothing sung yet");
});
(0, node_test_1.default)("only the current lyric is rendered — prev/next context is suppressed", () => {
    const r = new renderer_js_1.Renderer(60, 10);
    const s = (0, state_js_1.createInitialState)(60, 10);
    s.lyrics = [{ timeMs: 0, text: "PREV" }, { timeMs: 1000, text: "NOW" }, { timeMs: 2000, text: "NEXT" }];
    s.activeLyricIndex = 1;
    s.progressMs = 2000;
    (0, lyrics_js_1.renderLyrics)(r, { x: 0, y: 0, width: 60, height: 10 }, s, (0, theme_js_1.buildTheme)(0, true), new Set());
    const all = r.debugLines().join("\n").toLowerCase();
    node_assert_1.default.ok(!all.includes("prev"), "prev lyric line must not be rendered");
    node_assert_1.default.ok(!all.includes("next"), "next lyric line must not be rendered");
});
(0, node_test_1.default)("sungSoFar returns linear char reveal across the line's time window", () => {
    const text = "HELLO WORLD"; // 11 chars
    // At t=lineStart → 0 chars
    node_assert_1.default.strictEqual((0, lyrics_js_1.sungSoFar)(text, 1000, 2100, 1000), "");
    // Midway through 1100ms window → round(0.5*11)=6 chars → "HELLO " (with trailing space)
    node_assert_1.default.strictEqual((0, lyrics_js_1.sungSoFar)(text, 1000, 2100, 1550), "HELLO ");
    // Past end → full text
    node_assert_1.default.strictEqual((0, lyrics_js_1.sungSoFar)(text, 1000, 2100, 3000), text);
});
(0, node_test_1.default)("active lyric switches over ~250ms before the line's timestamp (lead offset)", async () => {
    const { updateActiveLyric } = await Promise.resolve().then(() => __importStar(require("../feeders/lyricsFeeder.js")));
    const s = (0, state_js_1.createInitialState)(60, 10);
    s.lyrics = [
        { timeMs: 0, text: "LINE A" },
        { timeMs: 2000, text: "LINE B" },
    ];
    // At progressMs = 1800ms (200ms before LINE B's timestamp), the lead
    // offset pushes effectiveNow to 2050ms → LINE B should already be active.
    s.progressMs = 1800;
    updateActiveLyric(s);
    node_assert_1.default.strictEqual(s.activeLyricIndex, 1, "LINE B should be active 200ms early due to lead offset");
});
(0, node_test_1.default)("sungSoFar uses a 4s fallback when there is no next line", () => {
    const text = "END"; // 3 chars, 4000ms window
    node_assert_1.default.strictEqual((0, lyrics_js_1.sungSoFar)(text, 0, undefined, 2000), "EN"); // round(0.5*3)=2
    node_assert_1.default.strictEqual((0, lyrics_js_1.sungSoFar)(text, 0, undefined, 4000), text);
});
(0, node_test_1.default)("shows — no lyrics — when list empty", () => {
    const r = new renderer_js_1.Renderer(60, 10);
    const s = (0, state_js_1.createInitialState)(60, 10);
    (0, lyrics_js_1.renderLyrics)(r, { x: 0, y: 0, width: 60, height: 10 }, s, (0, theme_js_1.buildTheme)(0, true), new Set());
    const all = r.debugLines().join("\n");
    node_assert_1.default.ok(all.includes("\u2014") || all.includes("no lyrics"));
});
//# sourceMappingURL=lyrics.test.js.map
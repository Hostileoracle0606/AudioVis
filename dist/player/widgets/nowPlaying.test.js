"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const renderer_js_1 = require("../../ui/renderer.js");
const nowPlaying_js_1 = require("./nowPlaying.js");
const state_js_1 = require("../state.js");
const theme_js_1 = require("../theme.js");
function setupState(track, artist) {
    const s = (0, state_js_1.createInitialState)(60, 15);
    s.nowPlaying = {
        trackName: track, artistName: artist, albumName: "album",
        albumArtUrl: "", deviceName: "s",
        isPlaying: true, progressMs: 0, durationMs: 200000,
    };
    s.isPlaying = true;
    return s;
}
const REGION = { x: 0, y: 0, width: 60, height: 15 };
(0, node_test_1.default)("track name and artist render as bitfont (half-block glyphs present)", () => {
    const r = new renderer_js_1.Renderer(60, 15);
    const s = setupState("hi", "yo");
    (0, nowPlaying_js_1.renderNowPlaying)(r, REGION, s, (0, theme_js_1.buildTheme)(0, true));
    const all = r.debugLines().join("\n");
    node_assert_1.default.ok(/[\u2580\u2584\u2588]/.test(all), "expected half-block glyphs for marquee");
});
(0, node_test_1.default)("DNA strip shows bpm / key / lufs with track-derived values", () => {
    const r = new renderer_js_1.Renderer(60, 15);
    const s = setupState("track a", "artist a");
    (0, nowPlaying_js_1.renderNowPlaying)(r, REGION, s, (0, theme_js_1.buildTheme)(0, true));
    const all = r.debugLines().join("\n");
    node_assert_1.default.match(all, /bpm\s+\d+/);
    node_assert_1.default.match(all, /key\s+[a-g]#?/i);
    node_assert_1.default.match(all, /lufs\s+-?\d+/i);
});
(0, node_test_1.default)("DNA strip shows energy/valence/dance/aco labels + gauges", () => {
    const r = new renderer_js_1.Renderer(60, 15);
    const s = setupState("track a", "artist a");
    (0, nowPlaying_js_1.renderNowPlaying)(r, REGION, s, (0, theme_js_1.buildTheme)(0, true));
    const all = r.debugLines().join("\n");
    for (const lbl of ["eng", "val", "dan", "aco"]) {
        node_assert_1.default.ok(all.includes(`${lbl} `), `missing ${lbl} label`);
    }
});
(0, node_test_1.default)("DNA colour codes distinct per element — the widget emits specific 256-color SGRs", () => {
    const r = new renderer_js_1.Renderer(60, 15);
    const s = setupState("a", "b");
    (0, nowPlaying_js_1.renderNowPlaying)(r, REGION, s, (0, theme_js_1.buildTheme)(0, true));
    const raw = r.cells.join("");
    for (const code of ["38;5;220", "38;5;49", "38;5;202", "38;5;201", "38;5;81"]) {
        node_assert_1.default.ok(raw.includes(code), `missing SGR ${code}`);
    }
});
(0, node_test_1.default)("widget does NOT render the old meter strip, transport row, or pgm footer", () => {
    const r = new renderer_js_1.Renderer(60, 15);
    const s = setupState("a", "b");
    s.meterL = 0.73;
    s.meterR = 0.68;
    (0, nowPlaying_js_1.renderNowPlaying)(r, REGION, s, (0, theme_js_1.buildTheme)(0, true));
    const all = r.debugLines().join("\n");
    node_assert_1.default.ok(!/73%/.test(all), "old meter percentage should be gone");
    node_assert_1.default.ok(!/\[\u25B7 play\]/.test(all), "old transport row should be gone");
    node_assert_1.default.ok(!/pgm \d/.test(all), "old pgm footer should be gone");
});
(0, node_test_1.default)("when width allows, a Lissajous phase-scope panel renders in the amp chassis", () => {
    const r = new renderer_js_1.Renderer(80, 15);
    const s = setupState("a", "b");
    s.meterL = 0.7;
    s.meterR = 0.5;
    for (let i = 0; i < s.spectrum.length; i++)
        s.spectrum[i] = 0.4;
    (0, nowPlaying_js_1.renderNowPlaying)(r, { x: 0, y: 0, width: 80, height: 15 }, s, (0, theme_js_1.buildTheme)(0, true));
    const all = r.debugLines().join("\n");
    node_assert_1.default.match(all, /scope/i, "scope chassis title missing");
    // Heavy-line chassis frame characters.
    node_assert_1.default.ok(/[\u250F\u2503\u2513\u2517\u251B\u2501]/.test(all), "heavy-line chassis border missing");
    // Braille dot patterns occupy U+2800..U+28FF.
    node_assert_1.default.ok(/[\u2800-\u28FF]/.test(all), "no Braille dot glyphs rendered");
});
(0, node_test_1.default)("narrow regions do NOT render the scope panel (room-check enforced)", () => {
    const r = new renderer_js_1.Renderer(40, 15);
    const s = setupState("a", "b");
    (0, nowPlaying_js_1.renderNowPlaying)(r, { x: 0, y: 0, width: 40, height: 15 }, s, (0, theme_js_1.buildTheme)(0, true));
    const all = r.debugLines().join("\n");
    node_assert_1.default.ok(!/scope/i.test(all), "scope panel should hide on narrow regions");
});
(0, node_test_1.default)("long track names shrink to tiny bitfont — never falls back to plain text", () => {
    const r = new renderer_js_1.Renderer(60, 15);
    const long = "A REALLY LONG TRACK NAME THAT WILL NEVER FIT IN MINI BITFONT";
    const s = setupState(long, "b");
    (0, nowPlaying_js_1.renderNowPlaying)(r, { x: 0, y: 0, width: 60, height: 15 }, s, (0, theme_js_1.buildTheme)(0, true));
    const all = r.debugLines().join("\n");
    // Must still render as half-block bitfont (tiny variant), not raw letters.
    node_assert_1.default.ok(/[\u2580\u2584\u2588]/.test(all), "tiny bitfont must still be in use for long title");
    // And the raw plain-text letters of the title must NOT appear (no fallback).
    node_assert_1.default.ok(!all.includes("REALLY LONG"), "plain-text fallback must not occur — shrink to tiny bitfont");
});
(0, node_test_1.default)("short track names render as bitfont (half-block glyphs), not plain text", () => {
    const r = new renderer_js_1.Renderer(120, 15);
    const s = setupState("HI", "YO");
    (0, nowPlaying_js_1.renderNowPlaying)(r, { x: 0, y: 0, width: 120, height: 15 }, s, (0, theme_js_1.buildTheme)(0, true));
    const all = r.debugLines().join("\n");
    node_assert_1.default.ok(/[\u2580\u2584\u2588]/.test(all), "short title should render as bitfont");
});
(0, node_test_1.default)("shows — no track — when nowPlaying is null", () => {
    const r = new renderer_js_1.Renderer(60, 15);
    const s = (0, state_js_1.createInitialState)(60, 15);
    (0, nowPlaying_js_1.renderNowPlaying)(r, REGION, s, (0, theme_js_1.buildTheme)(0, true));
    const all = r.debugLines().join("\n");
    node_assert_1.default.ok(all.includes("\u2014") || all.includes("no track"));
});
//# sourceMappingURL=nowPlaying.test.js.map
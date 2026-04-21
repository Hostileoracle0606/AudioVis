"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const renderer_js_1 = require("../../ui/renderer.js");
const albumArt_js_1 = require("./albumArt.js");
const state_js_1 = require("../state.js");
const theme_js_1 = require("../theme.js");
(0, node_test_1.default)("renderAlbumArt draws the framed [ screen · NNN ] label", () => {
    const r = new renderer_js_1.Renderer(40, 15);
    const s = (0, state_js_1.createInitialState)(40, 15);
    s.recentlyPlayed = [{
            trackName: "x", artistName: "y", albumName: "z", albumArtUrl: "", deviceName: "s",
            isPlaying: true, progressMs: 0, durationMs: 0,
        }];
    (0, albumArt_js_1.renderAlbumArt)(r, { x: 0, y: 0, width: 40, height: 15 }, s, (0, theme_js_1.buildTheme)(0, true));
    const all = r.debugLines().join("\n");
    node_assert_1.default.match(all, /screen \u00B7 \d{3}/);
});
(0, node_test_1.default)("renderAlbumArt has no below-frame metadata chrome — just the framed art", () => {
    const r = new renderer_js_1.Renderer(40, 15);
    const s = (0, state_js_1.createInitialState)(40, 15);
    s.rms = 0.73;
    (0, albumArt_js_1.renderAlbumArt)(r, { x: 0, y: 0, width: 40, height: 15 }, s, (0, theme_js_1.buildTheme)(0, true));
    const all = r.debugLines().join("\n");
    node_assert_1.default.ok(!all.includes("rms 0.73"), "rms metadata row should be gone");
    node_assert_1.default.ok(!all.includes("ansilize"), "ansilize description row should be gone");
    node_assert_1.default.ok(!all.includes("peak hold"), "peak-hold meta row should be gone");
});
(0, node_test_1.default)("renderAlbumArt shows — no art — when albumArt null", () => {
    const r = new renderer_js_1.Renderer(40, 15);
    const s = (0, state_js_1.createInitialState)(40, 15);
    (0, albumArt_js_1.renderAlbumArt)(r, { x: 0, y: 0, width: 40, height: 15 }, s, (0, theme_js_1.buildTheme)(0, true));
    const all = r.debugLines().join("\n");
    node_assert_1.default.ok(all.includes("no art") || all.includes("\u2014"));
});
(0, node_test_1.default)("blank mode shows [ OFF ]", () => {
    const r = new renderer_js_1.Renderer(40, 15);
    const s = (0, state_js_1.createInitialState)(40, 15);
    s.artCellMode = "blank";
    (0, albumArt_js_1.renderAlbumArt)(r, { x: 0, y: 0, width: 40, height: 15 }, s, (0, theme_js_1.buildTheme)(0, true));
    const all = r.debugLines().join("\n");
    node_assert_1.default.ok(all.includes("OFF"));
});
//# sourceMappingURL=albumArt.test.js.map
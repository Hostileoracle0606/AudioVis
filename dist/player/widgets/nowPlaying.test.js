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
(0, node_test_1.default)("nowPlaying renders placeholder when no track", () => {
    const r = new renderer_js_1.Renderer(60, 20);
    const s = (0, state_js_1.createInitialState)(60, 20);
    (0, nowPlaying_js_1.renderNowPlaying)(r, { x: 0, y: 0, width: 60, height: 10 }, s, (0, theme_js_1.buildTheme)(0, true));
    const lines = r.debugLines();
    node_assert_1.default.ok(lines[1].includes("— no track —") || lines[2].includes("— no track —"));
});
(0, node_test_1.default)("nowPlaying shows title, artist, album, and meter labels", () => {
    const r = new renderer_js_1.Renderer(60, 20);
    const s = (0, state_js_1.createInitialState)(60, 20);
    s.nowPlaying = {
        trackName: "D.A.N.C.E.", artistName: "Justice", albumName: "Cross",
        albumArtUrl: "", deviceName: "Spotify", isPlaying: true,
        progressMs: 0, durationMs: 0,
    };
    s.meterL = 0.8;
    s.meterR = 0.8;
    (0, nowPlaying_js_1.renderNowPlaying)(r, { x: 0, y: 0, width: 60, height: 10 }, s, (0, theme_js_1.buildTheme)(0, true));
    const joined = r.debugLines().join("\n");
    node_assert_1.default.match(joined, /TITLE:\s+D\.A\.N\.C\.E\./);
    node_assert_1.default.match(joined, /ARTIST:\s+Justice/);
    node_assert_1.default.match(joined, /ALBUM:\s+Cross/);
    node_assert_1.default.match(joined, /MASTER OUT/);
    node_assert_1.default.match(joined, /L \[/);
    node_assert_1.default.match(joined, /R \[/);
});
//# sourceMappingURL=nowPlaying.test.js.map
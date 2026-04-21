"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const renderer_js_1 = require("../ui/renderer.js");
const layout_js_1 = require("./layout.js");
const state_js_1 = require("./state.js");
const theme_js_1 = require("./theme.js");
const borders_js_1 = require("../ui/borders.js");
const accentArbiter_js_1 = require("./accentArbiter.js");
const titleBar_js_1 = require("./widgets/titleBar.js");
const albumArt_js_1 = require("./widgets/albumArt.js");
const nowPlaying_js_1 = require("./widgets/nowPlaying.js");
const queuePads_js_1 = require("./widgets/queuePads.js");
const lyrics_js_1 = require("./widgets/lyrics.js");
const spectrum_js_1 = require("./widgets/spectrum.js");
const controls_js_1 = require("./widgets/controls.js");
(0, node_test_1.default)("full frame renders without throwing, no cross junctions", () => {
    const cols = 120, rows = 32;
    const r = new renderer_js_1.Renderer(cols, rows);
    const s = (0, state_js_1.createInitialState)(cols, rows);
    s.nowPlaying = {
        trackName: "killer on the loose",
        artistName: "rex vijayan",
        albumName: "killer on the loose",
        albumArtUrl: "",
        deviceName: "s",
        isPlaying: true,
        progressMs: 90_000,
        durationMs: 180_000,
    };
    s.isPlaying = true;
    s.progressMs = 90_000;
    s.durationMs = 180_000;
    s.recentlyPlayed = [s.nowPlaying];
    s.lyrics = [
        { timeMs: 0, text: "killer on the loose" },
        { timeMs: 5000, text: "feeling one with the truth" },
        { timeMs: 10000, text: "wolves on the hill" },
    ];
    s.activeLyricIndex = 1;
    s.meterL = 0.73;
    s.meterR = 0.68;
    s.rms = 0.5;
    s.cpuPct = 19.7;
    const L = (0, layout_js_1.computeAppLayout)(cols, rows);
    const theme = (0, theme_js_1.buildTheme)(0, true);
    const accent = (0, accentArbiter_js_1.resolveAccentTargets)(s, Date.now());
    (0, borders_js_1.drawOuterFrame)(r);
    (0, borders_js_1.drawHSeparator)(r, L.sep1Y, { down: L.sep1Down, up: [] });
    (0, borders_js_1.drawHSeparator)(r, L.sep2Y, { down: L.sep2Down, up: L.sep2Up });
    (0, borders_js_1.drawHSeparator)(r, L.sep3Y, { down: [], up: L.sep3Up });
    (0, borders_js_1.drawVDivider)(r, L.sep1Down[0], L.topRow.y, L.topRow.y + L.topRow.height - 1);
    (0, borders_js_1.drawVDivider)(r, L.sep1Down[1], L.topRow.y, L.topRow.y + L.topRow.height - 1);
    (0, borders_js_1.drawVDivider)(r, L.sep2Down[0], L.middleRow.y, L.middleRow.y + L.middleRow.height - 1);
    (0, titleBar_js_1.renderTitleBar)(r, L, s, theme, accent);
    (0, albumArt_js_1.renderAlbumArt)(r, L.screenR, s, theme);
    (0, nowPlaying_js_1.renderNowPlaying)(r, L.nowR, s, theme);
    (0, queuePads_js_1.renderQueuePads)(r, L.padsR, s, theme);
    (0, lyrics_js_1.renderLyrics)(r, L.lyricsR, s, theme, accent);
    (0, spectrum_js_1.renderSpectrum)(r, L.spectrumR, s, theme, accent);
    (0, controls_js_1.renderControls)(r, L, s, theme);
    const lines = r.debugLines();
    const joined = lines.join("\n");
    node_assert_1.default.ok(!joined.includes("\u253C"), "unexpected \u253C cross in frame");
    for (const label of ["TUI\u00B7AMP", "screen \u00B7", "now \u00B7 track", "pads \u00B7 step", "lyrics", "spectrum"]) {
        node_assert_1.default.ok(joined.includes(label), `missing label ${JSON.stringify(label)}`);
    }
    for (let y = 0; y < rows; y++) {
        node_assert_1.default.strictEqual(lines[y].length, cols, `row ${y} length ${lines[y].length}`);
    }
});
//# sourceMappingURL=App.test.js.map
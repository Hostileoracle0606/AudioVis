"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const renderer_js_1 = require("../../ui/renderer.js");
const recentlyPlayed_js_1 = require("./recentlyPlayed.js");
const state_js_1 = require("../state.js");
const theme_js_1 = require("../theme.js");
const t = (n) => ({
    trackName: n, artistName: "x", albumName: "x", albumArtUrl: "",
    deviceName: "Spotify", isPlaying: true, progressMs: 0, durationMs: 0,
});
(0, node_test_1.default)("recentlyPlayed shows label", () => {
    const r = new renderer_js_1.Renderer(40, 12);
    const s = (0, state_js_1.createInitialState)(40, 12);
    (0, recentlyPlayed_js_1.renderRecentlyPlayed)(r, { x: 0, y: 0, width: 40, height: 10 }, s, (0, theme_js_1.buildTheme)(0, true));
    node_assert_1.default.ok(r.debugLines().join("\n").includes("RECENTLY PLAYED"));
});
(0, node_test_1.default)("recentlyPlayed lists track names with > prefix", () => {
    const r = new renderer_js_1.Renderer(40, 12);
    const s = (0, state_js_1.createInitialState)(40, 12);
    (0, state_js_1.pushRecentlyPlayed)(s, t("Genesis"));
    (0, state_js_1.pushRecentlyPlayed)(s, t("Phantom"));
    (0, recentlyPlayed_js_1.renderRecentlyPlayed)(r, { x: 0, y: 0, width: 40, height: 10 }, s, (0, theme_js_1.buildTheme)(0, true));
    const all = r.debugLines().join("\n");
    node_assert_1.default.match(all, />\s*Phantom/);
    node_assert_1.default.match(all, />\s*Genesis/);
});
//# sourceMappingURL=recentlyPlayed.test.js.map
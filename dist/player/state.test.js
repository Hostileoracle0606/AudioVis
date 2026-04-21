"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const state_js_1 = require("./state.js");
const track = (id) => ({
    trackName: `t-${id}`,
    artistName: "a",
    albumName: "al",
    albumArtUrl: "",
    deviceName: "Spotify",
    isPlaying: true,
    progressMs: 0,
    durationMs: 1000,
});
(0, node_test_1.default)("createInitialState returns sane defaults", () => {
    const s = (0, state_js_1.createInitialState)(120, 40);
    node_assert_1.default.strictEqual(s.cols, 120);
    node_assert_1.default.strictEqual(s.rows, 40);
    node_assert_1.default.strictEqual(s.spectrum.length, 16);
    node_assert_1.default.strictEqual(s.recentlyPlayed.length, 0);
});
(0, node_test_1.default)("pushRecentlyPlayed dedups same-trackName in a row", () => {
    const s = (0, state_js_1.createInitialState)(120, 40);
    (0, state_js_1.pushRecentlyPlayed)(s, track("1"));
    (0, state_js_1.pushRecentlyPlayed)(s, track("1"));
    node_assert_1.default.strictEqual(s.recentlyPlayed.length, 1);
});
(0, node_test_1.default)("pushRecentlyPlayed preserves order most-recent-first", () => {
    const s = (0, state_js_1.createInitialState)(120, 40);
    (0, state_js_1.pushRecentlyPlayed)(s, track("a"));
    (0, state_js_1.pushRecentlyPlayed)(s, track("b"));
    (0, state_js_1.pushRecentlyPlayed)(s, track("c"));
    node_assert_1.default.deepStrictEqual(s.recentlyPlayed.map(e => e.trackName), ["t-c", "t-b", "t-a"]);
});
(0, node_test_1.default)("pushRecentlyPlayed caps at 8 entries", () => {
    const s = (0, state_js_1.createInitialState)(120, 40);
    for (let i = 0; i < 20; i++)
        (0, state_js_1.pushRecentlyPlayed)(s, track(String(i)));
    node_assert_1.default.strictEqual(s.recentlyPlayed.length, 8);
    node_assert_1.default.strictEqual(s.recentlyPlayed[0].trackName, "t-19");
    node_assert_1.default.strictEqual(s.recentlyPlayed[7].trackName, "t-12");
});
(0, node_test_1.default)("createInitialState includes new reactivity fields", () => {
    const s = (0, state_js_1.createInitialState)(100, 30);
    node_assert_1.default.strictEqual(s.lastTransientAt, 0);
    node_assert_1.default.strictEqual(s.lastClipAt, 0);
    node_assert_1.default.strictEqual(s.lastPeakAt, 0);
    node_assert_1.default.strictEqual(s.progressEnvelope.length, 128);
    node_assert_1.default.strictEqual(s.ledChaserIndex, 0);
    node_assert_1.default.strictEqual(s.activePadIndex, 0);
    node_assert_1.default.ok(Array.isArray(s.padFingerprints));
    node_assert_1.default.strictEqual(s.padFingerprints.length, 8);
});
//# sourceMappingURL=state.test.js.map
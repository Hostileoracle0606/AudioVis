"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const spotifyDesktop_js_1 = require("./spotifyDesktop.js");
(0, node_test_1.default)("playTrack rejects non-spotify-track URIs", async () => {
    await node_assert_1.default.rejects(() => (0, spotifyDesktop_js_1.playTrack)("https://example.com/song"), /spotify:track:/);
});
(0, node_test_1.default)("playTrack rejects empty URI", async () => {
    await node_assert_1.default.rejects(() => (0, spotifyDesktop_js_1.playTrack)(""), /spotify:track:/);
});
//# sourceMappingURL=spotifyDesktop.test.js.map
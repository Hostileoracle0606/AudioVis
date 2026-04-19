"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const spotifyDesktop_js_1 = require("./spotifyDesktop.js");
(0, node_test_1.default)("parseSpotifyDesktopStateOutput parses playing state", () => {
    const parsed = (0, spotifyDesktop_js_1.parseSpotifyDesktopStateOutput)("status=ok|track=Genesis|artist=Grimes|album=Visions|duration=255000|position=125000|playing=1|app=Spotify");
    strict_1.default.equal(parsed.status, "ok");
    if (parsed.status !== "ok")
        return;
    strict_1.default.equal(parsed.state.trackName, "Genesis");
    strict_1.default.equal(parsed.state.artistName, "Grimes");
    strict_1.default.equal(parsed.state.durationMs, 255000);
    strict_1.default.equal(parsed.state.progressMs, 125000);
    strict_1.default.equal(parsed.state.isPlaying, true);
});
(0, node_test_1.default)("parseSpotifyDesktopStateOutput handles no running Spotify process", () => {
    const parsed = (0, spotifyDesktop_js_1.parseSpotifyDesktopStateOutput)("status=not_running");
    strict_1.default.deepEqual(parsed, { status: "not_running" });
});
(0, node_test_1.default)("parseSpotifyDesktopStateOutput rejects malformed payloads", () => {
    const parsed = (0, spotifyDesktop_js_1.parseSpotifyDesktopStateOutput)("status=ok|track=Only Track|artist=Missing duration");
    strict_1.default.equal(parsed.status, "error");
    if (parsed.status !== "error")
        return;
    strict_1.default.match(parsed.message, /Malformed/);
});
//# sourceMappingURL=spotifyDesktop.test.js.map
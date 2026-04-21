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
Object.defineProperty(exports, "__esModule", { value: true });
exports.startSpotifyFeeder = startSpotifyFeeder;
const spotifyDesktop = __importStar(require("../../macos/spotifyDesktop.js"));
const state_js_1 = require("../state.js");
function startSpotifyFeeder(state, onTrackChanged) {
    let inFlight = false;
    let lastKey = "";
    const tick = async () => {
        if (inFlight)
            return;
        inFlight = true;
        try {
            const s = await spotifyDesktop.getState();
            if (!s) {
                state.nowPlaying = null;
                state.isPlaying = false;
                return;
            }
            state.nowPlaying = s;
            state.isPlaying = s.isPlaying;
            state.progressMs = s.progressMs;
            state.durationMs = s.durationMs;
            const pollAt = Date.now();
            state.lastSpotifyPollAt = pollAt;
            // Re-anchor the extrapolation baseline on every poll. Without this,
            // the render-loop clock would drift past reality after any pause/
            // seek because `baselineAt` only used to reset on track change.
            state.progressBaselineAt = pollAt;
            state.progressBaselineMs = s.progressMs;
            const key = `${s.trackName}\u0000${s.artistName}`;
            if (key !== lastKey) {
                lastKey = key;
                (0, state_js_1.pushRecentlyPlayed)(state, s);
                onTrackChanged(s.trackName, s.artistName, s.albumName, s.albumArtUrl);
            }
        }
        catch {
            state.nowPlaying = null;
        }
        finally {
            inFlight = false;
        }
    };
    const id = setInterval(tick, 1000);
    void tick();
    return () => clearInterval(id);
}
//# sourceMappingURL=spotifyFeeder.js.map
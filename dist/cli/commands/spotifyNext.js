"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSpotifyNext = registerSpotifyNext;
const client_js_1 = require("../../spotify/client.js");
const errors_js_1 = require("../../utils/errors.js");
const picocolors_1 = __importDefault(require("picocolors"));
function registerSpotifyNext(spotify) {
    spotify
        .command("next")
        .description("Skip to next track")
        .option("--device <id>", "Target device ID")
        .action(async (opts) => {
        try {
            await (0, client_js_1.nextTrack)(opts.device);
            console.log(picocolors_1.default.green("Skipped to next track."));
        }
        catch (err) {
            (0, errors_js_1.fatalError)("Failed to skip track", err);
        }
    });
}
//# sourceMappingURL=spotifyNext.js.map
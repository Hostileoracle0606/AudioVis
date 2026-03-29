"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSpotifyPrev = registerSpotifyPrev;
const client_js_1 = require("../../spotify/client.js");
const errors_js_1 = require("../../utils/errors.js");
const picocolors_1 = __importDefault(require("picocolors"));
function registerSpotifyPrev(spotify) {
    spotify
        .command("prev")
        .description("Skip to previous track")
        .option("--device <id>", "Target device ID")
        .action(async (opts) => {
        try {
            await (0, client_js_1.previousTrack)(opts.device);
            console.log(picocolors_1.default.green("Skipped to previous track."));
        }
        catch (err) {
            (0, errors_js_1.fatalError)("Failed to go to previous track", err);
        }
    });
}
//# sourceMappingURL=spotifyPrev.js.map
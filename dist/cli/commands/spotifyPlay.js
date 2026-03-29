"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSpotifyPlay = registerSpotifyPlay;
const client_js_1 = require("../../spotify/client.js");
const errors_js_1 = require("../../utils/errors.js");
const picocolors_1 = __importDefault(require("picocolors"));
function registerSpotifyPlay(spotify) {
    spotify
        .command("play")
        .description("Resume playback")
        .option("--device <id>", "Target device ID")
        .action(async (opts) => {
        try {
            await (0, client_js_1.play)(opts.device);
            console.log(picocolors_1.default.green("Playback started."));
        }
        catch (err) {
            (0, errors_js_1.fatalError)("Failed to start playback", err);
        }
    });
}
//# sourceMappingURL=spotifyPlay.js.map
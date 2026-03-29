"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSpotifyVolume = registerSpotifyVolume;
const client_js_1 = require("../../spotify/client.js");
const errors_js_1 = require("../../utils/errors.js");
const picocolors_1 = __importDefault(require("picocolors"));
function registerSpotifyVolume(spotify) {
    spotify
        .command("volume <percent>")
        .description("Set playback volume (0-100)")
        .option("--device <id>", "Target device ID")
        .action(async (percent, opts) => {
        const pct = parseInt(percent, 10);
        if (isNaN(pct) || pct < 0 || pct > 100) {
            console.error(picocolors_1.default.red("Volume must be an integer between 0 and 100."));
            process.exit(1);
        }
        try {
            await (0, client_js_1.setVolume)(pct, opts.device);
            console.log(picocolors_1.default.green(`Volume set to ${pct}%.`));
        }
        catch (err) {
            (0, errors_js_1.fatalError)("Failed to set volume", err);
        }
    });
}
//# sourceMappingURL=spotifyVolume.js.map
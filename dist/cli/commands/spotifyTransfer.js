"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSpotifyTransfer = registerSpotifyTransfer;
const client_js_1 = require("../../spotify/client.js");
const errors_js_1 = require("../../utils/errors.js");
const picocolors_1 = __importDefault(require("picocolors"));
function registerSpotifyTransfer(spotify) {
    spotify
        .command("transfer <deviceId>")
        .description("Transfer playback to another device")
        .option("--play", "Start playback on the new device", false)
        .action(async (deviceId, opts) => {
        try {
            await (0, client_js_1.transferPlayback)(deviceId, opts.play);
            console.log(picocolors_1.default.green(`Playback transferred to ${deviceId}.`));
        }
        catch (err) {
            (0, errors_js_1.fatalError)("Failed to transfer playback", err);
        }
    });
}
//# sourceMappingURL=spotifyTransfer.js.map
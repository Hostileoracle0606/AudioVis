"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSpotifyCurrent = registerSpotifyCurrent;
const client_js_1 = require("../../spotify/client.js");
const errors_js_1 = require("../../utils/errors.js");
const format_js_1 = require("../../ui/format.js");
const picocolors_1 = __importDefault(require("picocolors"));
function registerSpotifyCurrent(spotify) {
    spotify
        .command("current")
        .description("Show currently playing track")
        .action(async () => {
        try {
            const playback = await (0, client_js_1.getCurrentPlayback)();
            if (!playback || !playback.item) {
                console.log(picocolors_1.default.yellow("Nothing is currently playing."));
                return;
            }
            const t = playback.item;
            const artists = t.artists.map((a) => a.name).join(", ");
            const elapsed = (0, format_js_1.formatSeconds)((playback.progress_ms ?? 0) / 1000);
            const total = (0, format_js_1.formatSeconds)(t.duration_ms / 1000);
            const state = playback.is_playing ? picocolors_1.default.green("Playing") : picocolors_1.default.yellow("Paused");
            console.log(`\n${picocolors_1.default.bold(t.name)}`);
            console.log(`Artist : ${artists}`);
            console.log(`Album  : ${t.album.name}`);
            console.log(`Time   : ${elapsed} / ${total}`);
            console.log(`State  : ${state}`);
            if (playback.device) {
                console.log(`Device : ${playback.device.name} (${playback.device.type})`);
            }
        }
        catch (err) {
            (0, errors_js_1.fatalError)("Failed to get current playback", err);
        }
    });
}
//# sourceMappingURL=spotifyCurrent.js.map
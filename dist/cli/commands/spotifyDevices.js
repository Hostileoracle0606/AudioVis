"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSpotifyDevices = registerSpotifyDevices;
const client_js_1 = require("../../spotify/client.js");
const errors_js_1 = require("../../utils/errors.js");
const picocolors_1 = __importDefault(require("picocolors"));
function registerSpotifyDevices(spotify) {
    spotify
        .command("devices")
        .description("List available Spotify devices")
        .action(async () => {
        try {
            const devices = await (0, client_js_1.getDevices)();
            if (devices.length === 0) {
                console.log(picocolors_1.default.yellow("No devices found. Open Spotify on any device first."));
                return;
            }
            console.log(`\nFound ${devices.length} device(s):\n`);
            for (const d of devices) {
                const active = d.is_active ? picocolors_1.default.green(" [active]") : "";
                const vol = d.volume_percent != null ? ` vol:${d.volume_percent}%` : "";
                console.log(`  ${picocolors_1.default.bold(d.id)}`);
                console.log(`    Name : ${d.name}${active}`);
                console.log(`    Type : ${d.type}${vol}`);
            }
        }
        catch (err) {
            (0, errors_js_1.fatalError)("Failed to get devices", err);
        }
    });
}
//# sourceMappingURL=spotifyDevices.js.map
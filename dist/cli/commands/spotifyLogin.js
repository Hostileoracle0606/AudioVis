"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSpotifyLogin = registerSpotifyLogin;
const auth_js_1 = require("../../spotify/auth.js");
const errors_js_1 = require("../../utils/errors.js");
const picocolors_1 = __importDefault(require("picocolors"));
function registerSpotifyLogin(spotify) {
    spotify
        .command("login")
        .description("Authenticate with Spotify (opens browser)")
        .action(async () => {
        try {
            console.log("Starting Spotify login...");
            const tokens = await (0, auth_js_1.login)();
            console.log(picocolors_1.default.green("\nLogin successful!"));
            console.log(`Access token expires in ${tokens.expires_in}s`);
        }
        catch (err) {
            (0, errors_js_1.fatalError)("Login failed", err);
        }
    });
}
//# sourceMappingURL=spotifyLogin.js.map
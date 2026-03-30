"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadEnv = loadEnv;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const store_js_1 = require("../config/store.js");
let loaded = false;
function loadEnv() {
    if (!loaded) {
        dotenv_1.default.config({ path: path_1.default.join(process.cwd(), ".env") });
        loaded = true;
    }
    const config = (0, store_js_1.loadConfig)();
    const clientId = process.env.SPOTIFY_CLIENT_ID ?? config.spotify?.clientId;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET ?? config.spotify?.clientSecret;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI ??
        config.spotify?.redirectUri ??
        "http://127.0.0.1:8888/callback";
    const callbackPort = parseInt(process.env.SPOTIFY_CALLBACK_PORT ??
        String(config.spotify?.callbackPort ?? 8888), 10);
    if (!clientId || !clientSecret) {
        throw new Error("Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET.\n" +
            "Run `myviz setup` or copy .env.example to .env and fill in your Spotify app credentials.");
    }
    return { clientId, clientSecret, redirectUri, callbackPort };
}
//# sourceMappingURL=env.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAuthUrl = buildAuthUrl;
exports.exchangeCode = exchangeCode;
exports.refreshAccessToken = refreshAccessToken;
exports.login = login;
const http_1 = __importDefault(require("http"));
const url_1 = require("url");
const axios_1 = __importDefault(require("axios"));
const open_1 = __importDefault(require("open"));
const env_js_1 = require("../utils/env.js");
const tokenStore_js_1 = require("./tokenStore.js");
const SCOPES = [
    "user-read-playback-state",
    "user-modify-playback-state",
    "user-read-currently-playing",
].join(" ");
function buildAuthUrl() {
    const env = (0, env_js_1.loadEnv)();
    const params = new URLSearchParams({
        response_type: "code",
        client_id: env.clientId,
        scope: SCOPES,
        redirect_uri: env.redirectUri,
    });
    return `https://accounts.spotify.com/authorize?${params.toString()}`;
}
async function exchangeCode(code) {
    const env = (0, env_js_1.loadEnv)();
    const credentials = Buffer.from(`${env.clientId}:${env.clientSecret}`).toString("base64");
    const res = await axios_1.default.post("https://accounts.spotify.com/api/token", new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: env.redirectUri,
    }), {
        headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
    });
    const now = Date.now();
    return {
        ...res.data,
        expires_at: now + res.data.expires_in * 1000,
    };
}
async function refreshAccessToken(refreshToken) {
    const env = (0, env_js_1.loadEnv)();
    const credentials = Buffer.from(`${env.clientId}:${env.clientSecret}`).toString("base64");
    const res = await axios_1.default.post("https://accounts.spotify.com/api/token", new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
    }), {
        headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
    });
    const current = (0, tokenStore_js_1.loadTokens)();
    const now = Date.now();
    return {
        ...res.data,
        // Spotify may not return a new refresh token; keep the old one.
        refresh_token: res.data.refresh_token ?? current?.refresh_token ?? refreshToken,
        expires_at: now + res.data.expires_in * 1000,
    };
}
/**
 * Full login flow: open browser, start callback server, exchange code.
 * Returns the saved TokenPayload.
 */
async function login() {
    const env = (0, env_js_1.loadEnv)();
    const callbackPort = env.callbackPort;
    return new Promise((resolve, reject) => {
        const server = http_1.default.createServer(async (req, res) => {
            if (!req.url)
                return;
            try {
                const parsed = new url_1.URL(req.url, `http://localhost:${callbackPort}`);
                if (parsed.pathname !== "/callback") {
                    res.writeHead(404);
                    res.end("Not found");
                    return;
                }
                const error = parsed.searchParams.get("error");
                if (error) {
                    res.writeHead(200, { "Content-Type": "text/html" });
                    res.end(`<h2>Authorization denied: ${error}</h2><p>You may close this tab.</p>`);
                    server.close();
                    reject(new Error(`Spotify auth denied: ${error}`));
                    return;
                }
                const code = parsed.searchParams.get("code");
                if (!code) {
                    res.writeHead(400);
                    res.end("Missing code");
                    server.close();
                    reject(new Error("No authorization code in callback"));
                    return;
                }
                res.writeHead(200, { "Content-Type": "text/html" });
                res.end(`<h2>Login successful!</h2><p>Return to your terminal. You may close this tab.</p>`);
                const tokens = await exchangeCode(code);
                (0, tokenStore_js_1.saveTokens)(tokens);
                server.close();
                resolve(tokens);
            }
            catch (err) {
                server.close();
                reject(err);
            }
        });
        server.listen(callbackPort, "127.0.0.1", async () => {
            const authUrl = buildAuthUrl();
            console.log(`\nOpening browser for Spotify login...\nURL: ${authUrl}\n`);
            await (0, open_1.default)(authUrl);
        });
        server.on("error", (err) => {
            reject(new Error(`Callback server error: ${err.message}`));
        });
    });
}
//# sourceMappingURL=auth.js.map
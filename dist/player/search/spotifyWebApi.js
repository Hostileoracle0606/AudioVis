"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.__setAxiosForTest = __setAxiosForTest;
exports.__resetTokenCacheForTest = __resetTokenCacheForTest;
exports.getAccessToken = getAccessToken;
exports.searchTracks = searchTracks;
const axios_1 = __importDefault(require("axios"));
let httpClient = axios_1.default;
function __setAxiosForTest(c) { httpClient = c; }
let tokenCache = null;
function __resetTokenCacheForTest() { tokenCache = null; }
async function getAccessToken() {
    const now = Date.now();
    if (tokenCache && tokenCache.expiresAt - now > 60_000)
        return tokenCache.token;
    const cid = process.env.SPOTIFY_CLIENT_ID;
    const secret = process.env.SPOTIFY_CLIENT_SECRET;
    if (!cid || !secret)
        throw new Error("Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET");
    const basic = Buffer.from(`${cid}:${secret}`).toString("base64");
    const res = await httpClient.post("https://accounts.spotify.com/api/token", "grant_type=client_credentials", {
        headers: {
            "Authorization": `Basic ${basic}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
    });
    const token = res.data.access_token;
    const expiresIn = res.data.expires_in ?? 3600;
    tokenCache = { token, expiresAt: now + expiresIn * 1000 };
    return token;
}
async function searchTracks(query, signal) {
    const trimmed = query.trim();
    if (!trimmed)
        return [];
    let token = await getAccessToken();
    const doSearch = async (tk) => httpClient.get(`https://api.spotify.com/v1/search?q=${encodeURIComponent(trimmed)}&type=track&limit=8`, { headers: { Authorization: `Bearer ${tk}` }, signal });
    let res;
    try {
        res = await doSearch(token);
    }
    catch (err) {
        if (err?.response?.status === 401) {
            tokenCache = null;
            token = await getAccessToken();
            res = await doSearch(token);
        }
        else {
            throw err;
        }
    }
    const items = (res.data?.tracks?.items ?? []);
    return items.map((it) => ({
        id: it.id,
        uri: it.uri,
        name: it.name,
        artist: (it.artists ?? []).map((a) => a.name).join(", "),
        album: it.album?.name ?? "",
        durationMs: it.duration_ms ?? 0,
    }));
}
//# sourceMappingURL=spotifyWebApi.js.map
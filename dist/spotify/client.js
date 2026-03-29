"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAccessToken = getAccessToken;
exports.getCurrentPlayback = getCurrentPlayback;
exports.getDevices = getDevices;
exports.play = play;
exports.pause = pause;
exports.nextTrack = nextTrack;
exports.previousTrack = previousTrack;
exports.setVolume = setVolume;
exports.transferPlayback = transferPlayback;
const axios_1 = __importDefault(require("axios"));
const tokenStore_js_1 = require("./tokenStore.js");
const auth_js_1 = require("./auth.js");
const BASE = "https://api.spotify.com/v1";
async function getAccessToken() {
    const tokens = (0, tokenStore_js_1.loadTokens)();
    if (!tokens) {
        throw new Error('Not authenticated. Run "myviz spotify login" first.');
    }
    // Refresh if expiring within 30 seconds.
    if (Date.now() >= tokens.expires_at - 30_000) {
        const refreshed = await (0, auth_js_1.refreshAccessToken)(tokens.refresh_token);
        (0, tokenStore_js_1.saveTokens)(refreshed);
        return refreshed.access_token;
    }
    return tokens.access_token;
}
// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
async function apiGet(path) {
    const token = await getAccessToken();
    try {
        const res = await axios_1.default.get(`${BASE}${path}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.data;
    }
    catch (err) {
        const ae = err;
        if (ae.response?.status === 204 || ae.response?.status === 404)
            return null;
        if (ae.response?.status === 401) {
            // Token refresh is handled by getAccessToken() on the next call.
            return null;
        }
        throw err;
    }
}
async function apiPut(path, body) {
    const token = await getAccessToken();
    try {
        await axios_1.default.put(`${BASE}${path}`, body ?? null, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        });
    }
    catch (err) {
        const ae = err;
        // 204 = success, no content
        if (ae.response?.status === 204)
            return;
        if (ae.response?.status === 403) {
            // Premium required
            throw new Error("Spotify Premium is required for playback control.");
        }
        if (ae.response?.status === 404) {
            throw new Error("No active Spotify device found. Start Spotify on a device first.");
        }
        throw err;
    }
}
async function apiPost(path, body) {
    const token = await getAccessToken();
    try {
        await axios_1.default.post(`${BASE}${path}`, body ?? null, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        });
    }
    catch (err) {
        const ae = err;
        if (ae.response?.status === 204)
            return;
        if (ae.response?.status === 404) {
            throw new Error("No active Spotify device found. Start Spotify on a device first.");
        }
        throw err;
    }
}
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
async function getCurrentPlayback() {
    return apiGet("/me/player");
}
async function getDevices() {
    const res = await apiGet("/me/player/devices");
    return res?.devices ?? [];
}
async function play(deviceId) {
    const query = deviceId ? `?device_id=${deviceId}` : "";
    await apiPut(`/me/player/play${query}`);
}
async function pause(deviceId) {
    const query = deviceId ? `?device_id=${deviceId}` : "";
    await apiPut(`/me/player/pause${query}`);
}
async function nextTrack(deviceId) {
    const query = deviceId ? `?device_id=${deviceId}` : "";
    await apiPost(`/me/player/next${query}`);
}
async function previousTrack(deviceId) {
    const query = deviceId ? `?device_id=${deviceId}` : "";
    await apiPost(`/me/player/previous${query}`);
}
async function setVolume(percent, deviceId) {
    const clamped = Math.max(0, Math.min(100, Math.round(percent)));
    const query = deviceId
        ? `?volume_percent=${clamped}&device_id=${deviceId}`
        : `?volume_percent=${clamped}`;
    await apiPut(`/me/player/volume${query}`);
}
async function transferPlayback(deviceId, startPlaying = false) {
    await apiPut("/me/player", {
        device_ids: [deviceId],
        play: startPlaying,
    });
}
//# sourceMappingURL=client.js.map
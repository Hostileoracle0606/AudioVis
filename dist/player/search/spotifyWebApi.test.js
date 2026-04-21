"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const spotifyWebApi_js_1 = require("./spotifyWebApi.js");
function mockAxios(plan) {
    let idx = 0;
    return {
        get: async (url) => {
            const step = plan[idx++];
            node_assert_1.default.ok(step, `no more mock steps (got GET ${url})`);
            node_assert_1.default.strictEqual(step.method, "get");
            node_assert_1.default.ok(step.url.test(url), `unexpected URL: ${url}`);
            if (step.reply instanceof Error)
                throw step.reply;
            if (step.reply.status >= 400) {
                const err = new Error("http");
                err.response = step.reply;
                throw err;
            }
            return step.reply;
        },
        post: async (url) => {
            const step = plan[idx++];
            node_assert_1.default.ok(step);
            node_assert_1.default.strictEqual(step.method, "post");
            node_assert_1.default.ok(step.url.test(url));
            return step.reply;
        },
    };
}
(0, node_test_1.default)("getAccessToken caches the bearer until near expiry", async () => {
    (0, spotifyWebApi_js_1.__resetTokenCacheForTest)();
    (0, spotifyWebApi_js_1.__setAxiosForTest)(mockAxios([
        { url: /accounts\.spotify\.com\/api\/token/, method: "post", reply: { status: 200, data: { access_token: "T1", expires_in: 3600 } } },
    ]));
    process.env.SPOTIFY_CLIENT_ID = "cid";
    process.env.SPOTIFY_CLIENT_SECRET = "csecret";
    const t1 = await (0, spotifyWebApi_js_1.getAccessToken)();
    const t2 = await (0, spotifyWebApi_js_1.getAccessToken)();
    node_assert_1.default.strictEqual(t1, "T1");
    node_assert_1.default.strictEqual(t2, "T1");
});
(0, node_test_1.default)("searchTracks returns normalized results", async () => {
    (0, spotifyWebApi_js_1.__resetTokenCacheForTest)();
    (0, spotifyWebApi_js_1.__setAxiosForTest)(mockAxios([
        { url: /api\/token/, method: "post", reply: { status: 200, data: { access_token: "T", expires_in: 3600 } } },
        { url: /\/v1\/search/, method: "get", reply: { status: 200, data: {
                    tracks: { items: [
                            { id: "x1", uri: "spotify:track:x1", name: "Song", duration_ms: 240000,
                                artists: [{ name: "Art1" }, { name: "Art2" }],
                                album: { name: "Alb" } },
                        ] }
                } } },
    ]));
    const results = await (0, spotifyWebApi_js_1.searchTracks)("justice");
    node_assert_1.default.strictEqual(results.length, 1);
    node_assert_1.default.strictEqual(results[0].uri, "spotify:track:x1");
    node_assert_1.default.strictEqual(results[0].artist, "Art1, Art2");
});
(0, node_test_1.default)("searchTracks retries once on 401 by re-fetching token", async () => {
    (0, spotifyWebApi_js_1.__resetTokenCacheForTest)();
    (0, spotifyWebApi_js_1.__setAxiosForTest)(mockAxios([
        { url: /api\/token/, method: "post", reply: { status: 200, data: { access_token: "T1", expires_in: 3600 } } },
        { url: /\/v1\/search/, method: "get", reply: { status: 401, data: {} } },
        { url: /api\/token/, method: "post", reply: { status: 200, data: { access_token: "T2", expires_in: 3600 } } },
        { url: /\/v1\/search/, method: "get", reply: { status: 200, data: { tracks: { items: [] } } } },
    ]));
    const results = await (0, spotifyWebApi_js_1.searchTracks)("x");
    node_assert_1.default.deepStrictEqual(results, []);
});
//# sourceMappingURL=spotifyWebApi.test.js.map
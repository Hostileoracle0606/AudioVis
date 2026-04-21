import test from "node:test";
import assert from "node:assert";
import { __setAxiosForTest, __resetTokenCacheForTest, searchTracks, getAccessToken } from "./spotifyWebApi.js";

function mockAxios(plan: Array<{ url: RegExp; method: "get" | "post"; reply: { status: number; data: unknown } | Error }>) {
  let idx = 0;
  return {
    get: async (url: string) => {
      const step = plan[idx++];
      assert.ok(step, `no more mock steps (got GET ${url})`);
      assert.strictEqual(step.method, "get");
      assert.ok(step.url.test(url), `unexpected URL: ${url}`);
      if (step.reply instanceof Error) throw step.reply;
      if (step.reply.status >= 400) {
        const err: any = new Error("http"); err.response = step.reply; throw err;
      }
      return step.reply;
    },
    post: async (url: string) => {
      const step = plan[idx++];
      assert.ok(step);
      assert.strictEqual(step.method, "post");
      assert.ok(step.url.test(url));
      return step.reply as { status: number; data: unknown };
    },
  };
}

test("getAccessToken caches the bearer until near expiry", async () => {
  __resetTokenCacheForTest();
  __setAxiosForTest(mockAxios([
    { url: /accounts\.spotify\.com\/api\/token/, method: "post", reply: { status: 200, data: { access_token: "T1", expires_in: 3600 } } },
  ]) as any);
  process.env.SPOTIFY_CLIENT_ID = "cid";
  process.env.SPOTIFY_CLIENT_SECRET = "csecret";
  const t1 = await getAccessToken();
  const t2 = await getAccessToken();
  assert.strictEqual(t1, "T1");
  assert.strictEqual(t2, "T1");
});

test("searchTracks returns normalized results", async () => {
  __resetTokenCacheForTest();
  __setAxiosForTest(mockAxios([
    { url: /api\/token/, method: "post", reply: { status: 200, data: { access_token: "T", expires_in: 3600 } } },
    { url: /\/v1\/search/, method: "get", reply: { status: 200, data: {
      tracks: { items: [
        { id: "x1", uri: "spotify:track:x1", name: "Song", duration_ms: 240000,
          artists: [{ name: "Art1" }, { name: "Art2" }],
          album: { name: "Alb" } },
      ] }
    } } },
  ]) as any);
  const results = await searchTracks("justice");
  assert.strictEqual(results.length, 1);
  assert.strictEqual(results[0].uri, "spotify:track:x1");
  assert.strictEqual(results[0].artist, "Art1, Art2");
});

test("searchTracks retries once on 401 by re-fetching token", async () => {
  __resetTokenCacheForTest();
  __setAxiosForTest(mockAxios([
    { url: /api\/token/, method: "post", reply: { status: 200, data: { access_token: "T1", expires_in: 3600 } } },
    { url: /\/v1\/search/, method: "get", reply: { status: 401, data: {} } },
    { url: /api\/token/, method: "post", reply: { status: 200, data: { access_token: "T2", expires_in: 3600 } } },
    { url: /\/v1\/search/, method: "get", reply: { status: 200, data: { tracks: { items: [] } } } },
  ]) as any);
  const results = await searchTracks("x");
  assert.deepStrictEqual(results, []);
});

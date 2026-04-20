import test from "node:test";
import assert from "node:assert";
import { createInitialState, pushRecentlyPlayed } from "./state.js";

const track = (id: string) => ({
  trackName: `t-${id}`,
  artistName: "a",
  albumName: "al",
  albumArtUrl: "",
  deviceName: "Spotify",
  isPlaying: true,
  progressMs: 0,
  durationMs: 1000,
});

test("createInitialState returns sane defaults", () => {
  const s = createInitialState(120, 40);
  assert.strictEqual(s.cols, 120);
  assert.strictEqual(s.rows, 40);
  assert.strictEqual(s.spectrum.length, 16);
  assert.strictEqual(s.recentlyPlayed.length, 0);
  assert.strictEqual(s.search.focused, false);
});

test("pushRecentlyPlayed dedups same-trackName in a row", () => {
  const s = createInitialState(120, 40);
  pushRecentlyPlayed(s, track("1"));
  pushRecentlyPlayed(s, track("1"));
  assert.strictEqual(s.recentlyPlayed.length, 1);
});

test("pushRecentlyPlayed preserves order most-recent-first", () => {
  const s = createInitialState(120, 40);
  pushRecentlyPlayed(s, track("a"));
  pushRecentlyPlayed(s, track("b"));
  pushRecentlyPlayed(s, track("c"));
  assert.deepStrictEqual(s.recentlyPlayed.map(e => e.trackName), ["t-c", "t-b", "t-a"]);
});

test("pushRecentlyPlayed caps at 8 entries", () => {
  const s = createInitialState(120, 40);
  for (let i = 0; i < 20; i++) pushRecentlyPlayed(s, track(String(i)));
  assert.strictEqual(s.recentlyPlayed.length, 8);
  assert.strictEqual(s.recentlyPlayed[0].trackName, "t-19");
  assert.strictEqual(s.recentlyPlayed[7].trackName, "t-12");
});

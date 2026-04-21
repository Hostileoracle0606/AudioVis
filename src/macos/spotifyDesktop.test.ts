import test from "node:test";
import assert from "node:assert";
import { playTrack } from "./spotifyDesktop.js";

test("playTrack rejects non-spotify-track URIs", async () => {
  await assert.rejects(
    () => playTrack("https://example.com/song"),
    /spotify:track:/
  );
});

test("playTrack rejects empty URI", async () => {
  await assert.rejects(() => playTrack(""), /spotify:track:/);
});

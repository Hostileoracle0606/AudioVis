import test from "node:test";
import assert from "node:assert";
import { Renderer } from "../../ui/renderer.js";
import { renderNowPlaying } from "./nowPlaying.js";
import { createInitialState } from "../state.js";
import { buildTheme } from "../theme.js";

test("nowPlaying renders placeholder when no track", () => {
  const r = new Renderer(60, 20);
  const s = createInitialState(60, 20);
  renderNowPlaying(r, { x: 0, y: 0, width: 60, height: 10 }, s, buildTheme(0, true));
  const lines = r.debugLines();
  assert.ok(lines[1].includes("— no track —") || lines[2].includes("— no track —"));
});

test("nowPlaying shows title, artist, album, and meter labels", () => {
  const r = new Renderer(60, 20);
  const s = createInitialState(60, 20);
  s.nowPlaying = {
    trackName: "D.A.N.C.E.", artistName: "Justice", albumName: "Cross",
    albumArtUrl: "", deviceName: "Spotify", isPlaying: true,
    progressMs: 0, durationMs: 0,
  };
  s.meterL = 0.8; s.meterR = 0.8;
  renderNowPlaying(r, { x: 0, y: 0, width: 60, height: 10 }, s, buildTheme(0, true));
  const joined = r.debugLines().join("\n");
  assert.match(joined, /TITLE:\s+D\.A\.N\.C\.E\./);
  assert.match(joined, /ARTIST:\s+Justice/);
  assert.match(joined, /ALBUM:\s+Cross/);
  assert.match(joined, /MASTER OUT/);
  assert.match(joined, /L \[/);
  assert.match(joined, /R \[/);
});

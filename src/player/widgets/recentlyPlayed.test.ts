import test from "node:test";
import assert from "node:assert";
import { Renderer } from "../../ui/renderer.js";
import { renderRecentlyPlayed } from "./recentlyPlayed.js";
import { createInitialState, pushRecentlyPlayed } from "../state.js";
import { buildTheme } from "../theme.js";

const t = (n: string) => ({
  trackName: n, artistName: "x", albumName: "x", albumArtUrl: "",
  deviceName: "Spotify", isPlaying: true, progressMs: 0, durationMs: 0,
});

test("recentlyPlayed shows label", () => {
  const r = new Renderer(40, 12);
  const s = createInitialState(40, 12);
  renderRecentlyPlayed(r, { x: 0, y: 0, width: 40, height: 10 }, s, buildTheme(0, true));
  assert.ok(r.debugLines().join("\n").includes("RECENTLY PLAYED"));
});

test("recentlyPlayed lists track names with > prefix", () => {
  const r = new Renderer(40, 12);
  const s = createInitialState(40, 12);
  pushRecentlyPlayed(s, t("Genesis"));
  pushRecentlyPlayed(s, t("Phantom"));
  renderRecentlyPlayed(r, { x: 0, y: 0, width: 40, height: 10 }, s, buildTheme(0, true));
  const all = r.debugLines().join("\n");
  assert.match(all, />\s*Phantom/);
  assert.match(all, />\s*Genesis/);
});

import test from "node:test";
import assert from "node:assert";
import { Renderer } from "../../ui/renderer.js";
import { renderAlbumArt } from "./albumArt.js";
import { createInitialState } from "../state.js";
import { buildTheme } from "../theme.js";

test("renderAlbumArt draws the framed [ screen · NNN ] label", () => {
  const r = new Renderer(40, 15);
  const s = createInitialState(40, 15);
  s.recentlyPlayed = [{
    trackName: "x", artistName: "y", albumName: "z", albumArtUrl: "", deviceName: "s",
    isPlaying: true, progressMs: 0, durationMs: 0,
  }];
  renderAlbumArt(r, { x: 0, y: 0, width: 40, height: 15 }, s, buildTheme(0, true));
  const all = r.debugLines().join("\n");
  assert.match(all, /screen \u00B7 \d{3}/);
});

test("renderAlbumArt has no below-frame metadata chrome — just the framed art", () => {
  const r = new Renderer(40, 15);
  const s = createInitialState(40, 15);
  s.rms = 0.73;
  renderAlbumArt(r, { x: 0, y: 0, width: 40, height: 15 }, s, buildTheme(0, true));
  const all = r.debugLines().join("\n");
  assert.ok(!all.includes("rms 0.73"), "rms metadata row should be gone");
  assert.ok(!all.includes("ansilize"), "ansilize description row should be gone");
  assert.ok(!all.includes("peak hold"), "peak-hold meta row should be gone");
});

test("renderAlbumArt shows — no art — when albumArt null", () => {
  const r = new Renderer(40, 15);
  const s = createInitialState(40, 15);
  renderAlbumArt(r, { x: 0, y: 0, width: 40, height: 15 }, s, buildTheme(0, true));
  const all = r.debugLines().join("\n");
  assert.ok(all.includes("no art") || all.includes("\u2014"));
});

test("blank mode shows [ OFF ]", () => {
  const r = new Renderer(40, 15);
  const s = createInitialState(40, 15);
  s.artCellMode = "blank";
  renderAlbumArt(r, { x: 0, y: 0, width: 40, height: 15 }, s, buildTheme(0, true));
  const all = r.debugLines().join("\n");
  assert.ok(all.includes("OFF"));
});

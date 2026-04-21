import test from "node:test";
import assert from "node:assert";
import { Renderer } from "../../ui/renderer.js";
import { renderNowPlaying } from "./nowPlaying.js";
import { createInitialState } from "../state.js";
import { buildTheme } from "../theme.js";

function setupState(track: string, artist: string) {
  const s = createInitialState(40, 15);
  s.nowPlaying = {
    trackName: track, artistName: artist, albumName: "album",
    albumArtUrl: "", deviceName: "s",
    isPlaying: true, progressMs: 0, durationMs: 200000,
  };
  s.isPlaying = true;
  s.meterL = 0.73;
  s.meterR = 0.68;
  return s;
}

test("title row shows ▸ {trackName}", () => {
  const r = new Renderer(40, 15);
  const s = setupState("killer on the loose", "rex vijayan");
  renderNowPlaying(r, { x: 0, y: 0, width: 40, height: 15 }, s, buildTheme(0, true));
  const all = r.debugLines().join("\n");
  assert.ok(all.includes("\u25B8 killer"));
  assert.ok(all.includes("rex vijayan"));
});

test("DNA strip shows bpm key lufs with track-varying values", () => {
  const r = new Renderer(40, 15);
  const s = setupState("track a", "artist a");
  renderNowPlaying(r, { x: 0, y: 0, width: 40, height: 15 }, s, buildTheme(0, true));
  const all = r.debugLines().join("\n");
  assert.match(all, /bpm \d+/);
  assert.match(all, /key [a-g]#?/i);
  assert.match(all, /-\d+ lufs/);
});

test("DNA strip shows engine/valence/dance/aco gauges", () => {
  const r = new Renderer(40, 15);
  const s = setupState("track a", "artist a");
  renderNowPlaying(r, { x: 0, y: 0, width: 40, height: 15 }, s, buildTheme(0, true));
  const all = r.debugLines().join("\n");
  assert.match(all, /eng /);
  assert.match(all, /val /);
  assert.match(all, /dan /);
  assert.match(all, /aco /);
});

test("meter strip shows L and R with percentages", () => {
  const r = new Renderer(40, 15);
  const s = setupState("a", "b");
  renderNowPlaying(r, { x: 0, y: 0, width: 40, height: 15 }, s, buildTheme(0, true));
  const all = r.debugLines().join("\n");
  assert.match(all, /L .* 73%/);
  assert.match(all, /R .* 68%/);
});

test("transport strip shows play/stop/rec/loop glyphs", () => {
  const r = new Renderer(40, 15);
  const s = setupState("a", "b");
  renderNowPlaying(r, { x: 0, y: 0, width: 40, height: 15 }, s, buildTheme(0, true));
  const all = r.debugLines().join("\n");
  assert.ok(all.includes("\u25B7"), "expected ▷ play glyph");
  assert.ok(all.includes("\u25A0"), "expected ■ stop glyph");
  assert.ok(all.includes("\u25C9"), "expected ◉ rec glyph");
});

test("shows — no track — when nowPlaying is null", () => {
  const r = new Renderer(40, 15);
  const s = createInitialState(40, 15);
  renderNowPlaying(r, { x: 0, y: 0, width: 40, height: 15 }, s, buildTheme(0, true));
  const all = r.debugLines().join("\n");
  assert.ok(all.includes("\u2014") || all.includes("no track"));
});

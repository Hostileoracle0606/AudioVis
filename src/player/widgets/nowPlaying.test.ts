import test from "node:test";
import assert from "node:assert";
import { Renderer } from "../../ui/renderer.js";
import { renderNowPlaying } from "./nowPlaying.js";
import { createInitialState } from "../state.js";
import { buildTheme } from "../theme.js";

function setupState(track: string, artist: string) {
  const s = createInitialState(60, 15);
  s.nowPlaying = {
    trackName: track, artistName: artist, albumName: "album",
    albumArtUrl: "", deviceName: "s",
    isPlaying: true, progressMs: 0, durationMs: 200000,
  };
  s.isPlaying = true;
  return s;
}

const REGION = { x: 0, y: 0, width: 60, height: 15 };

test("track name and artist render as bitfont (half-block glyphs present)", () => {
  const r = new Renderer(60, 15);
  const s = setupState("hi", "yo");
  renderNowPlaying(r, REGION, s, buildTheme(0, true));
  const all = r.debugLines().join("\n");
  assert.ok(/[\u2580\u2584\u2588]/.test(all), "expected half-block glyphs for marquee");
});

test("DNA strip shows bpm / key / lufs with track-derived values", () => {
  const r = new Renderer(60, 15);
  const s = setupState("track a", "artist a");
  renderNowPlaying(r, REGION, s, buildTheme(0, true));
  const all = r.debugLines().join("\n");
  assert.match(all, /bpm\s+\d+/);
  assert.match(all, /key\s+[a-g]#?/i);
  assert.match(all, /lufs\s+-?\d+/i);
});

test("DNA strip shows energy/valence/dance/aco labels + gauges", () => {
  const r = new Renderer(60, 15);
  const s = setupState("track a", "artist a");
  renderNowPlaying(r, REGION, s, buildTheme(0, true));
  const all = r.debugLines().join("\n");
  for (const lbl of ["eng", "val", "dan", "aco"]) {
    assert.ok(all.includes(`${lbl} `), `missing ${lbl} label`);
  }
});

test("DNA colour codes distinct per element — the widget emits specific 256-color SGRs", () => {
  const r = new Renderer(60, 15);
  const s = setupState("a", "b");
  renderNowPlaying(r, REGION, s, buildTheme(0, true));
  const raw = (r as any).cells.join("");
  for (const code of ["38;5;220", "38;5;49", "38;5;202", "38;5;201", "38;5;81"]) {
    assert.ok(raw.includes(code), `missing SGR ${code}`);
  }
});

test("widget does NOT render the old meter strip, transport row, or pgm footer", () => {
  const r = new Renderer(60, 15);
  const s = setupState("a", "b");
  s.meterL = 0.73;
  s.meterR = 0.68;
  renderNowPlaying(r, REGION, s, buildTheme(0, true));
  const all = r.debugLines().join("\n");
  assert.ok(!/73%/.test(all), "old meter percentage should be gone");
  assert.ok(!/\[\u25B7 play\]/.test(all), "old transport row should be gone");
  assert.ok(!/pgm \d/.test(all), "old pgm footer should be gone");
});

test("when width allows, a Lissajous phase-scope panel renders in the amp chassis", () => {
  const r = new Renderer(80, 15);
  const s = setupState("a", "b");
  s.meterL = 0.7;
  s.meterR = 0.5;
  for (let i = 0; i < s.spectrum.length; i++) s.spectrum[i] = 0.4;
  renderNowPlaying(r, { x: 0, y: 0, width: 80, height: 15 }, s, buildTheme(0, true));
  const all = r.debugLines().join("\n");
  assert.match(all, /scope/i, "scope chassis title missing");
  // Heavy-line chassis frame characters.
  assert.ok(/[\u250F\u2503\u2513\u2517\u251B\u2501]/.test(all), "heavy-line chassis border missing");
  // Braille dot patterns occupy U+2800..U+28FF.
  assert.ok(/[\u2800-\u28FF]/.test(all), "no Braille dot glyphs rendered");
});

test("narrow regions do NOT render the scope panel (room-check enforced)", () => {
  const r = new Renderer(40, 15);
  const s = setupState("a", "b");
  renderNowPlaying(r, { x: 0, y: 0, width: 40, height: 15 }, s, buildTheme(0, true));
  const all = r.debugLines().join("\n");
  assert.ok(!/scope/i.test(all), "scope panel should hide on narrow regions");
});

test("long track names shrink to tiny bitfont — never falls back to plain text", () => {
  const r = new Renderer(60, 15);
  const long = "A REALLY LONG TRACK NAME THAT WILL NEVER FIT IN MINI BITFONT";
  const s = setupState(long, "b");
  renderNowPlaying(r, { x: 0, y: 0, width: 60, height: 15 }, s, buildTheme(0, true));
  const all = r.debugLines().join("\n");
  // Must still render as half-block bitfont (tiny variant), not raw letters.
  assert.ok(/[\u2580\u2584\u2588]/.test(all), "tiny bitfont must still be in use for long title");
  // And the raw plain-text letters of the title must NOT appear (no fallback).
  assert.ok(!all.includes("REALLY LONG"), "plain-text fallback must not occur — shrink to tiny bitfont");
});

test("short track names render as bitfont (half-block glyphs), not plain text", () => {
  const r = new Renderer(120, 15);
  const s = setupState("HI", "YO");
  renderNowPlaying(r, { x: 0, y: 0, width: 120, height: 15 }, s, buildTheme(0, true));
  const all = r.debugLines().join("\n");
  assert.ok(/[\u2580\u2584\u2588]/.test(all), "short title should render as bitfont");
});

test("shows — no track — when nowPlaying is null", () => {
  const r = new Renderer(60, 15);
  const s = createInitialState(60, 15);
  renderNowPlaying(r, REGION, s, buildTheme(0, true));
  const all = r.debugLines().join("\n");
  assert.ok(all.includes("\u2014") || all.includes("no track"));
});

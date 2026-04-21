import test from "node:test";
import assert from "node:assert";
import { Renderer } from "../../ui/renderer.js";
import { renderLyrics, sungSoFar } from "./lyrics.js";
import { createInitialState } from "../state.js";
import { buildTheme } from "../theme.js";

test("lyrics panel shows header label", () => {
  const r = new Renderer(60, 10);
  const s = createInitialState(60, 10);
  renderLyrics(r, { x: 0, y: 0, width: 60, height: 10 }, s, buildTheme(0, true), new Set());
  assert.match(r.debugLines().join("\n"), /lyrics/);
});

test("active lyric renders in bitfont once progressMs reaches the line", () => {
  const r = new Renderer(60, 10);
  const s = createInitialState(60, 10);
  s.lyrics = [{ timeMs: 0, text: "HI" }, { timeMs: 1000, text: "HELLO" }];
  s.activeLyricIndex = 0;
  s.progressMs = 1000; // fully past line 0 — all chars revealed
  renderLyrics(r, { x: 0, y: 0, width: 60, height: 10 }, s, buildTheme(0, true), new Set());
  const all = r.debugLines().join("\n");
  assert.ok(/[\u2580\u2584\u2588]/.test(all), "expected half-block glyph");
});

test("no glyphs are rendered before the line's start time (accounting for the lead offset)", () => {
  const r = new Renderer(60, 10);
  const s = createInitialState(60, 10);
  s.lyrics = [{ timeMs: 2000, text: "HI" }, { timeMs: 3000, text: "YO" }];
  s.activeLyricIndex = 0;
  // The widget applies a +250ms lead. To be *before* the line's
  // effective start, progressMs must be <= lineStartMs - 250 - 1.
  s.progressMs = 1700;
  renderLyrics(r, { x: 0, y: 0, width: 60, height: 10 }, s, buildTheme(0, true), new Set());
  const all = r.debugLines().join("\n");
  assert.ok(!/[\u2580\u2584\u2588]/.test(all), "expected no glyphs when nothing sung yet");
});

test("only the current lyric is rendered — prev/next context is suppressed", () => {
  const r = new Renderer(60, 10);
  const s = createInitialState(60, 10);
  s.lyrics = [{ timeMs: 0, text: "PREV" }, { timeMs: 1000, text: "NOW" }, { timeMs: 2000, text: "NEXT" }];
  s.activeLyricIndex = 1;
  s.progressMs = 2000;
  renderLyrics(r, { x: 0, y: 0, width: 60, height: 10 }, s, buildTheme(0, true), new Set());
  const all = r.debugLines().join("\n").toLowerCase();
  assert.ok(!all.includes("prev"), "prev lyric line must not be rendered");
  assert.ok(!all.includes("next"), "next lyric line must not be rendered");
});

test("sungSoFar returns linear char reveal across the line's time window", () => {
  const text = "HELLO WORLD"; // 11 chars
  // At t=lineStart → 0 chars
  assert.strictEqual(sungSoFar(text, 1000, 2100, 1000), "");
  // Midway through 1100ms window → round(0.5*11)=6 chars → "HELLO " (with trailing space)
  assert.strictEqual(sungSoFar(text, 1000, 2100, 1550), "HELLO ");
  // Past end → full text
  assert.strictEqual(sungSoFar(text, 1000, 2100, 3000), text);
});

test("active lyric switches over ~250ms before the line's timestamp (lead offset)", async () => {
  const { updateActiveLyric } = await import("../feeders/lyricsFeeder.js");
  const s = createInitialState(60, 10);
  s.lyrics = [
    { timeMs: 0,    text: "LINE A" },
    { timeMs: 2000, text: "LINE B" },
  ];
  // At progressMs = 1800ms (200ms before LINE B's timestamp), the lead
  // offset pushes effectiveNow to 2050ms → LINE B should already be active.
  s.progressMs = 1800;
  updateActiveLyric(s);
  assert.strictEqual(s.activeLyricIndex, 1, "LINE B should be active 200ms early due to lead offset");
});

test("sungSoFar uses a 4s fallback when there is no next line", () => {
  const text = "END"; // 3 chars, 4000ms window
  assert.strictEqual(sungSoFar(text, 0, undefined, 2000), "EN"); // round(0.5*3)=2
  assert.strictEqual(sungSoFar(text, 0, undefined, 4000), text);
});

test("shows — no lyrics — when list empty", () => {
  const r = new Renderer(60, 10);
  const s = createInitialState(60, 10);
  renderLyrics(r, { x: 0, y: 0, width: 60, height: 10 }, s, buildTheme(0, true), new Set());
  const all = r.debugLines().join("\n");
  assert.ok(all.includes("\u2014") || all.includes("no lyrics"));
});

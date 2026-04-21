import test from "node:test";
import assert from "node:assert";
import { Renderer } from "../../ui/renderer.js";
import { renderLyrics } from "./lyrics.js";
import { createInitialState } from "../state.js";
import { buildTheme } from "../theme.js";

test("lyrics panel shows header label", () => {
  const r = new Renderer(60, 10);
  const s = createInitialState(60, 10);
  renderLyrics(r, { x: 0, y: 0, width: 60, height: 10 }, s, buildTheme(0, true), new Set());
  assert.match(r.debugLines().join("\n"), /lyrics/);
});

test("active lyric renders in bitfont when lyrics present", () => {
  const r = new Renderer(60, 10);
  const s = createInitialState(60, 10);
  s.lyrics = [{ timeMs: 0, text: "HI" }, { timeMs: 1000, text: "HELLO" }];
  s.activeLyricIndex = 0;
  renderLyrics(r, { x: 0, y: 0, width: 60, height: 10 }, s, buildTheme(0, true), new Set());
  const all = r.debugLines().join("\n");
  assert.ok(/[\u2580\u2584\u2588]/.test(all), "expected half-block glyph");
});

test("prev/next lines are shown in dim context", () => {
  const r = new Renderer(60, 10);
  const s = createInitialState(60, 10);
  s.lyrics = [{ timeMs: 0, text: "PREV" }, { timeMs: 1000, text: "NOW" }, { timeMs: 2000, text: "NEXT" }];
  s.activeLyricIndex = 1;
  renderLyrics(r, { x: 0, y: 0, width: 60, height: 10 }, s, buildTheme(0, true), new Set());
  const all = r.debugLines().join("\n");
  assert.ok(all.toLowerCase().includes("prev"));
  assert.ok(all.toLowerCase().includes("next"));
});

test("shows — no lyrics — when list empty", () => {
  const r = new Renderer(60, 10);
  const s = createInitialState(60, 10);
  renderLyrics(r, { x: 0, y: 0, width: 60, height: 10 }, s, buildTheme(0, true), new Set());
  const all = r.debugLines().join("\n");
  assert.ok(all.includes("\u2014") || all.includes("no lyrics"));
});

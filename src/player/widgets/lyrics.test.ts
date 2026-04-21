import test from "node:test";
import assert from "node:assert";
import { Renderer } from "../../ui/renderer.js";
import { renderLyrics } from "./lyrics.js";
import { createInitialState } from "../state.js";
import { buildTheme } from "../theme.js";

test("lyrics shows label and low-energy line as plain text", () => {
  const r = new Renderer(60, 20);
  const s = createInitialState(60, 20);
  s.lyrics = [{ timeMs: 0, text: "Do the dance" }, { timeMs: 5000, text: "Bounce" }];
  s.activeLyricIndex = 0;
  s.transientEnergy = 0.1;
  renderLyrics(r, { x: 0, y: 0, width: 60, height: 16 }, s, buildTheme(0, true));
  const joined = r.debugLines().join("\n");
  assert.match(joined, /KINETIC LYRICS/);
  assert.match(joined, /Do the dance/);
});

test("lyrics renders active line as big-font glyphs when energy > 0.6", () => {
  const r = new Renderer(60, 20);
  const s = createInitialState(60, 20);
  s.lyrics = [{ timeMs: 0, text: "BOUNCE" }];
  s.activeLyricIndex = 0;
  s.transientEnergy = 0.9;
  renderLyrics(r, { x: 0, y: 0, width: 60, height: 16 }, s, buildTheme(0, true));
  const joined = r.debugLines().join("\n");
  assert.ok(joined.includes("\u2588"), "expected block glyphs for FIGlet rendering");
  assert.match(joined, /TRANSIENT PEAK/);
});

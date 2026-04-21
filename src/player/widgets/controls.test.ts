import test from "node:test";
import assert from "node:assert";
import { Renderer } from "../../ui/renderer.js";
import { renderControls } from "./controls.js";
import { createInitialState } from "../state.js";
import { buildTheme } from "../theme.js";
import { computeAppLayout } from "../layout.js";

test("progress row shows elapsed / total timestamps", () => {
  const r = new Renderer(120, 30);
  const s = createInitialState(120, 30);
  s.progressMs = 92_000;
  s.durationMs = 182_000;
  const L = computeAppLayout(120, 30);
  renderControls(r, L, s, buildTheme(0, true));
  const all = r.debugLines().join("\n");
  assert.ok(all.includes("01:32"));
  assert.ok(all.includes("03:02"));
});

test("progress row contains Braille waveform glyphs", () => {
  const r = new Renderer(120, 30);
  const s = createInitialState(120, 30);
  s.progressMs = 60_000; s.durationMs = 120_000;
  for (let i = 0; i < 64; i++) s.progressEnvelope[i] = 0.5;
  const L = computeAppLayout(120, 30);
  renderControls(r, L, s, buildTheme(0, true));
  const all = r.debugLines().join("\n");
  assert.ok(/[\u2800-\u28FF]/.test(all), "expected Braille glyph in progress row");
});

test("key legend row contains core hotkeys", () => {
  const r = new Renderer(120, 30);
  const s = createInitialState(120, 30);
  const L = computeAppLayout(120, 30);
  renderControls(r, L, s, buildTheme(0, true));
  const all = r.debugLines().join("\n");
  assert.ok(all.includes("[p]"));
  assert.ok(all.includes("[q]"));
  assert.ok(all.includes("[1-8]"));
});

test("LED chaser strip renders ●/· pattern", () => {
  const r = new Renderer(120, 30);
  const s = createInitialState(120, 30);
  s.ledChaserIndex = 5;
  s.isPlaying = true;
  const L = computeAppLayout(120, 30);
  renderControls(r, L, s, buildTheme(0, true));
  const all = r.debugLines().join("\n");
  assert.ok(all.includes("\u25CF"), "expected ● in LED strip");
});

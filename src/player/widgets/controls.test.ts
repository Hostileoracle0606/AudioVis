import test from "node:test";
import assert from "node:assert";
import { Renderer } from "../../ui/renderer.js";
import { renderControls } from "./controls.js";
import { createInitialState } from "../state.js";
import { buildTheme } from "../theme.js";
import { computeAppLayout } from "../layout.js";

test("controls renders timestamps and scrubber", () => {
  const r = new Renderer(120, 40);
  const s = createInitialState(120, 40);
  s.progressMs = 74_000;
  s.durationMs = 242_000;
  const L = computeAppLayout(120, 40);
  renderControls(r, L, s, buildTheme(0, true));
  const lines = r.debugLines();
  assert.match(lines[L.scrubR.y], /01:14/);
  assert.match(lines[L.scrubR.y], /04:02/);
});

test("controls renders hotkey legend", () => {
  const r = new Renderer(120, 40);
  const s = createInitialState(120, 40);
  const L = computeAppLayout(120, 40);
  renderControls(r, L, s, buildTheme(0, true));
  const line = r.debugLines()[L.keysR.y];
  assert.match(line, /\[p\] Play/);
  assert.match(line, /\[n\] Next/);
  assert.match(line, /\[q\] Quit/);
});

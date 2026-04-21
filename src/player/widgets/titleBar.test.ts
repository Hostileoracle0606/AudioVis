import test from "node:test";
import assert from "node:assert";
import { Renderer } from "../../ui/renderer.js";
import { renderTitleBar } from "./titleBar.js";
import { computeAppLayout } from "../layout.js";
import { createInitialState } from "../state.js";
import { buildTheme } from "../theme.js";

test("titleBar shows TUI·AMP brand", () => {
  const r = new Renderer(120, 30);
  const s = createInitialState(120, 30);
  const L = computeAppLayout(120, 30);
  renderTitleBar(r, L, s, buildTheme(0, true), new Set());
  assert.match(r.debugLines().join("\n"), /TUI\u00B7AMP/);
});

test("titleBar shows sys load with cpu + rms readouts", () => {
  const r = new Renderer(120, 30);
  const s = createInitialState(120, 30);
  s.cpuPct = 19.7;
  s.rms = 0.73;
  const L = computeAppLayout(120, 30);
  renderTitleBar(r, L, s, buildTheme(0, true), new Set());
  const all = r.debugLines().join("\n");
  assert.match(all, /cpu\u00B7\s*19\.7/);
  assert.match(all, /rms\u00B7\s*0\.73/);
});

test("sync LED uses accent when sync in accent set", () => {
  const r = new Renderer(120, 30);
  const s = createInitialState(120, 30);
  const L = computeAppLayout(120, 30);
  const theme = buildTheme(0, false);
  renderTitleBar(r, L, s, theme, new Set(["sync"]));
  const raw = (r as any).cells.join("");
  assert.ok(raw.includes(theme.accent));
});

test("titleBar shows the hotkey legend in the former search slot", () => {
  const r = new Renderer(120, 30);
  const s = createInitialState(120, 30);
  const L = computeAppLayout(120, 30);
  renderTitleBar(r, L, s, buildTheme(0, true), new Set());
  const all = r.debugLines().join("\n");
  assert.match(all, /\[p\]lay/);
  assert.match(all, /\[q\]uit/);
  // Search hint must NOT appear — search has been removed.
  assert.ok(!/to search/.test(all), "search hint should be gone");
});

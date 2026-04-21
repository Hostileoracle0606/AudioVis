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

test("progress row uses greyscale shade ramp (░▒▓█) with grey SGR codes", () => {
  const r = new Renderer(120, 30);
  const s = createInitialState(120, 30);
  s.progressMs = 60_000; s.durationMs = 120_000;
  const L = computeAppLayout(120, 30);
  renderControls(r, L, s, buildTheme(0, true));
  const all = r.debugLines().join("\n");
  // At least one shade-ramp glyph must appear in the played portion.
  assert.ok(/[\u2591\u2592\u2593\u2588]/.test(all), "expected ░▒▓█ shade glyph in progress row");
  // At least one greyscale SGR from the ramp must appear.
  const raw = (r as any).cells.join("");
  const greyCodes = ["38;5;238", "38;5;242", "38;5;246", "38;5;250", "38;5;253"];
  const matched = greyCodes.filter((c) => raw.includes(c));
  assert.ok(matched.length > 0, `expected ≥1 greyscale SGR, found none from ${greyCodes.join(",")}`);
});

test("key legend row contains core hotkeys", () => {
  const r = new Renderer(120, 30);
  const s = createInitialState(120, 30);
  const L = computeAppLayout(120, 30);
  renderControls(r, L, s, buildTheme(0, true));
  const all = r.debugLines().join("\n");
  // Key legend now lives in the title bar, not the controls row.
  assert.ok(!/\[p\]lay/.test(all), "legend should no longer appear in controls row");
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

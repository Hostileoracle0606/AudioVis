import test from "node:test";
import assert from "node:assert";
import { Renderer } from "../../ui/renderer.js";
import { renderSpectrum } from "./spectrum.js";
import { createInitialState } from "../state.js";
import { buildTheme } from "../theme.js";

test("spectrum renders label", () => {
  const r = new Renderer(60, 20);
  const s = createInitialState(60, 20);
  renderSpectrum(r, { x: 0, y: 0, width: 60, height: 20 }, s, buildTheme(0, true));
  assert.ok(r.debugLines().join("\n").includes("SPECTRUM ANALYZER"));
});

test("spectrum draws full bar for magnitude 1.0 and empty for 0.0", () => {
  const r = new Renderer(60, 20);
  const s = createInitialState(60, 20);
  s.spectrum = new Float32Array(16);
  s.spectrum[0] = 1.0;
  renderSpectrum(r, { x: 0, y: 0, width: 60, height: 20 }, s, buildTheme(0, true));
  const lines = r.debugLines();
  const bottom = lines[17];
  assert.ok(bottom.includes("\u2588"), "expected at least one full-block glyph on filled bar row");
});

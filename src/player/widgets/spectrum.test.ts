import test from "node:test";
import assert from "node:assert";
import { Renderer } from "../../ui/renderer.js";
import { renderSpectrum } from "./spectrum.js";
import { createInitialState } from "../state.js";
import { buildTheme } from "../theme.js";

test("spectrum renders header with palette name and peak", () => {
  const r = new Renderer(80, 12);
  const s = createInitialState(80, 12);
  renderSpectrum(r, { x: 0, y: 0, width: 80, height: 12 }, s, buildTheme(0, true), new Set());
  const all = r.debugLines().join("\n");
  assert.match(all, /spectrum/i);
  assert.match(all, /amber|warm|AMBER/i);
});

test("spectrum shows Hz-label row", () => {
  const r = new Renderer(80, 12);
  const s = createInitialState(80, 12);
  renderSpectrum(r, { x: 0, y: 0, width: 80, height: 12 }, s, buildTheme(0, true), new Set());
  const all = r.debugLines().join("\n");
  assert.ok(all.includes("62") && all.includes("1k") && all.includes("8k"));
});

test("spectrum shows peak-hold ● row", () => {
  const r = new Renderer(80, 12);
  const s = createInitialState(80, 12);
  for (let i = 0; i < 16; i++) s.spectrum[i] = 0.5;
  renderSpectrum(r, { x: 0, y: 0, width: 80, height: 12 }, s, buildTheme(0, true), new Set());
  const all = r.debugLines().join("\n");
  assert.ok(all.includes("\u25CF"), "peak-hold ● row missing");
});

test("bass-bin accent applied when target set includes bass-bin", () => {
  const r = new Renderer(80, 12);
  const s = createInitialState(80, 12);
  s.spectrum[0] = 0.9;
  const theme = buildTheme(0, false);
  renderSpectrum(r, { x: 0, y: 0, width: 80, height: 12 }, s, theme, new Set(["bass-bin"]));
  const raw = (r as any).cells.join("");
  assert.ok(raw.includes(theme.accent), "accent not applied to bass bin");
});

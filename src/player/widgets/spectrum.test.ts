import test from "node:test";
import assert from "node:assert";
import { Renderer } from "../../ui/renderer.js";
import { renderSpectrum, distributeSlots, reactiveMag } from "./spectrum.js";
import { createInitialState } from "../state.js";
import { buildTheme } from "../theme.js";

test("distributeSlots sums every slot width to plotW with no leftover cells", () => {
  // Caller guarantees plotW >= n (renderSpectrum clamps via Math.max(NUM_BARS, …)).
  for (const [plotW, n] of [[80, 16], [100, 16], [43, 16], [16, 16]]) {
    const slots = distributeSlots(2, plotW, n);
    const sum = slots.reduce((a, s) => a + s.w, 0);
    assert.strictEqual(sum, plotW, `plotW=${plotW} n=${n} sum=${sum}`);
    assert.strictEqual(slots.length, n);
    for (let i = 1; i < slots.length; i++) {
      assert.strictEqual(slots[i].x, slots[i - 1].x + slots[i - 1].w, `gap at slot ${i}`);
    }
  }
});

test("reactiveMag boosts high-frequency bins via tilt", () => {
  const bass = reactiveMag(0.3, 0, 16, false);
  const treble = reactiveMag(0.3, 15, 16, false);
  assert.ok(treble > bass, `treble ${treble} should exceed bass ${bass} under tilt`);
});

test("reactiveMag clamps to [0,1] and never exceeds 1 under flash", () => {
  assert.strictEqual(reactiveMag(1, 15, 16, true), 1);
  assert.strictEqual(reactiveMag(-0.5, 0, 16, false), 0);
});

test("spectrum bars fill the full plot width (last bar touches right edge)", () => {
  const cols = 80;
  const r = new Renderer(cols, 14);
  const s = createInitialState(cols, 14);
  for (let i = 0; i < 16; i++) s.spectrum[i] = 1; // fully saturated so bars paint every column
  renderSpectrum(r, { x: 0, y: 0, width: cols, height: 14 }, s, buildTheme(0, true), new Set());
  const rows = r.debugLines();
  // Scan across all rows inside the plot region for any painted glyph at the
  // right-hand edge of the plot (col = width - 3).
  const rightEdge = cols - 3;
  let rightEdgePainted = false;
  for (let y = 2; y < 12; y++) {
    const ch = rows[y][rightEdge];
    if (ch && ch !== " ") { rightEdgePainted = true; break; }
  }
  assert.ok(rightEdgePainted, "no glyph reached the right edge of the plot area");
});

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
  // Bass emphasis uses the bright variant of the accent colour.
  assert.ok(
    raw.includes(theme.accentBright) || raw.includes(theme.accent),
    "no accent colour applied to bass bin",
  );
});

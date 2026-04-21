import test from "node:test";
import assert from "node:assert";
import { computeAppLayout, MIN_COLS, MIN_ROWS } from "./layout.js";

test("MIN_COLS=108 and MIN_ROWS=28", () => {
  assert.strictEqual(MIN_COLS, 108);
  assert.strictEqual(MIN_ROWS, 28);
});

test("top row: 15 rows tall; screen 28 / pads 36 fixed; now fills the rest", () => {
  const L = computeAppLayout(120, 36);
  assert.strictEqual(L.topRow.height, 15);
  assert.strictEqual(L.screenR.width, 28);
  assert.strictEqual(L.padsR.width, 36);
  assert.strictEqual(L.nowR.width, L.inner.width - 28 - 36);
  assert.strictEqual(L.screenR.width + L.nowR.width + L.padsR.width, L.inner.width);
});

test("middle row has minimum 8 rows", () => {
  const L = computeAppLayout(120, 36);
  assert.ok(L.middleRow.height >= 8, `middleRow height ${L.middleRow.height} < 8`);
});

test("middle halves split 55/45 in favor of lyrics", () => {
  const L = computeAppLayout(120, 36);
  assert.ok(L.lyricsR.width > L.spectrumR.width);
  assert.strictEqual(L.lyricsR.width + L.spectrumR.width, L.inner.width);
});

test("no cross junctions (up and down arrays disjoint)", () => {
  const L = computeAppLayout(120, 36);
  for (const x of L.sep2Up) assert.ok(!L.sep2Down.includes(x), `cross at x=${x} on sep2`);
});

test("reports tooSmall below minimums", () => {
  const L = computeAppLayout(MIN_COLS - 1, MIN_ROWS);
  assert.strictEqual(L.tooSmall, true);
});

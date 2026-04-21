import test from "node:test";
import assert from "node:assert";
import { computeAppLayout, MIN_COLS, MIN_ROWS } from "./layout.js";

test("layout tiles inner area exactly (no overlap, no gap)", () => {
  const L = computeAppLayout(120, 40);
  assert.strictEqual(L.tooSmall, false);
  // Title bar row
  assert.strictEqual(L.titleBar.y, 1);
  assert.strictEqual(L.titleBar.height, 1);
  // Middle row horizontal halves are equal (the hard requirement)
  assert.strictEqual(L.lyricsR.width, L.spectrumR.width,
    "middle row halves must be exactly equal in width");
  // Middle row cells together fill the inner width
  assert.strictEqual(L.lyricsR.width + L.spectrumR.width, 118);
  // Top row three columns sum to inner width
  assert.strictEqual(
    L.artR.width + L.nowR.width + L.recentR.width, 118,
    "top row columns must sum to inner width"
  );
});

test("layout reports tooSmall below minimums", () => {
  const L = computeAppLayout(MIN_COLS - 1, MIN_ROWS);
  assert.strictEqual(L.tooSmall, true);
});

test("layout provides junction X coordinates for separators", () => {
  const L = computeAppLayout(120, 40);
  // sep2 is below the top row: two ┴ (top-row dividers end) + one ┬ (middle-row divider begins)
  assert.strictEqual(L.sep2Up.length, 2);
  assert.strictEqual(L.sep2Down.length, 1);
  // Middle-row divider X = outer.x + 1 + lyricsR.width
  const expectedMid = 1 + L.lyricsR.width;
  assert.strictEqual(L.sep2Down[0], expectedMid);
});

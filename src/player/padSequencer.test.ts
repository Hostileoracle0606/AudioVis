import test from "node:test";
import assert from "node:assert";
import { computePadFrame, buildPattern } from "./padSequencer.js";

test("buildPattern lights exactly `onCount` bulbs and is deterministic", () => {
  const a = buildPattern(0xdeadbeef, 3, 2, 7);
  const b = buildPattern(0xdeadbeef, 3, 2, 7);
  assert.deepStrictEqual(Array.from(a), Array.from(b), "same inputs must produce identical patterns");
  const sum = a.reduce((acc, v) => acc + v, 0);
  assert.strictEqual(sum, 7, `expected 7 bulbs lit, got ${sum}`);
});

test("buildPattern with onCount=0 returns all zeros, onCount>=16 returns all ones", () => {
  const zero = buildPattern(1, 1, 1, 0);
  const all  = buildPattern(1, 1, 1, 16);
  assert.strictEqual(zero.reduce((a, v) => a + v, 0), 0);
  assert.strictEqual(all.reduce((a, v) => a + v, 0), 16);
});

test("computePadFrame advances the active step in time with bpm", () => {
  const bpm = 120; // stepMs = 60000/120 * 0.5 = 250ms
  const f0 = computePadFrame("id", bpm, 0,    0, 0);
  const f1 = computePadFrame("id", bpm, 250,  0, 0);
  const f2 = computePadFrame("id", bpm, 500,  0, 0);
  assert.strictEqual(f0.activeStep, 0);
  assert.strictEqual(f1.activeStep, 1);
  assert.strictEqual(f2.activeStep, 2);
});

test("computePadFrame wraps active step after 8 steps", () => {
  const bpm = 120;
  const f8 = computePadFrame("id", bpm, 250 * 8, 0, 0);
  assert.strictEqual(f8.activeStep, 0);
});

test("computePadFrame marks flashing=true within the transient window and false after", () => {
  const bpm = 120;
  const hit = computePadFrame("id", bpm, 1000, 1000, 1000);
  const late = computePadFrame("id", bpm, 1000, 1000, 1000 + 200);
  assert.strictEqual(hit.flashing, true);
  assert.strictEqual(late.flashing, false);
});

test("the active step's pattern has more lit bulbs than an inactive step's", () => {
  const f = computePadFrame("track|artist", 120, 0, 0, 0);
  const activeSum = f.patterns[f.activeStep].reduce((a, v) => a + v, 0);
  const inactive  = (f.activeStep + 1) % 8;
  const inactiveSum = f.patterns[inactive].reduce((a, v) => a + v, 0);
  assert.ok(activeSum > inactiveSum, `active ${activeSum} !> inactive ${inactiveSum}`);
});

test("different tracks produce different pad patterns at the same beat", () => {
  const a = computePadFrame("trackA|X", 120, 0, 0, 0);
  const b = computePadFrame("trackB|X", 120, 0, 0, 0);
  const same = a.patterns.every((p, i) =>
    p.every((v, j) => v === b.patterns[i][j]),
  );
  assert.ok(!same, "patterns should differ across track ids");
});

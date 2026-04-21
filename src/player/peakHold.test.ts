import test from "node:test";
import assert from "node:assert";
import { createPeakHold, updatePeakHold } from "./peakHold.js";

test("new max updates value and extends hold", () => {
  const buf = createPeakHold(3);
  updatePeakHold(buf, new Float32Array([0.5, 0.25, 0.75]), 1000, 500);
  assert.deepStrictEqual(Array.from(buf.values), [0.5, 0.25, 0.75]);
  assert.deepStrictEqual(Array.from(buf.heldUntilMs), [1500, 1500, 1500]);
});

test("lower current does not overwrite during hold", () => {
  const buf = createPeakHold(2);
  updatePeakHold(buf, new Float32Array([0.75, 0.25]), 1000, 500);
  updatePeakHold(buf, new Float32Array([0.125, 0.125]), 1200, 500);
  assert.strictEqual(buf.values[0], 0.75);
  assert.strictEqual(buf.values[1], 0.25);
});

test("after hold expires, value decays toward 0", () => {
  const buf = createPeakHold(1);
  updatePeakHold(buf, new Float32Array([1.0]), 1000, 500);
  // After hold, decay at 0.0002 per ms → 100ms = -0.02
  updatePeakHold(buf, new Float32Array([0.0]), 1600, 500);
  assert.ok(buf.values[0] < 1.0, "value should decay after hold expires");
  assert.ok(buf.values[0] >= 0, "value should not go negative");
});

test("value clamps at 0 and does not go negative", () => {
  const buf = createPeakHold(1);
  updatePeakHold(buf, new Float32Array([0.01]), 1000, 100);
  updatePeakHold(buf, new Float32Array([0]), 5000, 100);
  assert.strictEqual(buf.values[0], 0);
});

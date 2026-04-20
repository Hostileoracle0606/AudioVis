import test from "node:test";
import assert from "node:assert";
import { extractChannelPeaks } from "./channelPeaks.js";

const APPROX = 1e-6;
const approxEq = (actual: number, expected: number, msg?: string) =>
  assert.ok(
    Math.abs(actual - expected) < APPROX,
    msg ?? `expected ${actual} ≈ ${expected} within ${APPROX}`,
  );

test("extractChannelPeaks on mono returns single peak", () => {
  const buf = new Float32Array([0.1, -0.3, 0.5, -0.7]);
  const [p] = extractChannelPeaks(buf, 1);
  approxEq(p, 0.7);
});

test("extractChannelPeaks on stereo returns per-channel peaks", () => {
  // Interleaved: L0 R0 L1 R1 L2 R2
  const buf = new Float32Array([0.1, 0.8, 0.2, -0.4, -0.9, 0.3]);
  const [l, r] = extractChannelPeaks(buf, 2);
  approxEq(l, 0.9);
  approxEq(r, 0.8);
});

test("extractChannelPeaks returns zeros for empty buffer", () => {
  assert.deepStrictEqual(extractChannelPeaks(new Float32Array(0), 2), [0, 0]);
});

test("extractChannelPeaks clamps to [0,1]", () => {
  const buf = new Float32Array([2.0, -3.5]);
  const [l, r] = extractChannelPeaks(buf, 2);
  assert.strictEqual(l, 1);
  assert.strictEqual(r, 1);
});

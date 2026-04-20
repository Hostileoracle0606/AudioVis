import test from "node:test";
import assert from "node:assert";
import { mixToMono, extractChannel } from "./deinterleave.js";

test("mixToMono averages L and R", () => {
  const interleaved = new Float32Array([0.2, 0.8, -0.4, 0.0]);
  const mono = mixToMono(interleaved, 2);
  assert.strictEqual(mono.length, 2);
  assert.ok(Math.abs(mono[0] - 0.5) < 1e-6);
  assert.ok(Math.abs(mono[1] - -0.2) < 1e-6);
});

test("mixToMono handles already-mono input as passthrough copy", () => {
  const mono = mixToMono(new Float32Array([0.1, -0.2]), 1);
  assert.ok(Math.abs(mono[0] - 0.1) < 1e-6);
  assert.ok(Math.abs(mono[1] - -0.2) < 1e-6);
});

test("extractChannel returns one channel from interleaved stereo", () => {
  const buf = new Float32Array([1, 2, 3, 4, 5, 6]);
  assert.deepStrictEqual(Array.from(extractChannel(buf, 2, 0)), [1, 3, 5]);
  assert.deepStrictEqual(Array.from(extractChannel(buf, 2, 1)), [2, 4, 6]);
});

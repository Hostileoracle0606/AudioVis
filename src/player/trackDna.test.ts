import test from "node:test";
import assert from "node:assert";
import { computeDna, KEY_NAMES } from "./trackDna.js";

test("computeDna is deterministic", () => {
  const a = computeDna("killer on the loose|rex vijayan");
  const b = computeDna("killer on the loose|rex vijayan");
  assert.deepStrictEqual(a, b);
});

test("computeDna varies across track IDs", () => {
  const ids = Array.from({ length: 100 }, (_, i) => `track-${i}|artist`);
  const bpms = new Set(ids.map((id) => computeDna(id).bpm));
  assert.ok(bpms.size >= 40, `expected ≥40 unique bpms across 100 tracks, got ${bpms.size}`);
});

test("computeDna bpm is within 72-168", () => {
  for (let i = 0; i < 1000; i++) {
    const d = computeDna(`t${i}|a`);
    assert.ok(d.bpm >= 72 && d.bpm <= 168, `bpm ${d.bpm} out of range`);
  }
});

test("computeDna 0-100 gauges in range", () => {
  for (let i = 0; i < 1000; i++) {
    const d = computeDna(`t${i}|a`);
    for (const k of ["energy","valence","danceability","acousticness"] as const) {
      assert.ok(d[k] >= 0 && d[k] <= 100, `${k} ${d[k]} out of range`);
    }
  }
});

test("computeDna lufs is within -19 to -4", () => {
  for (let i = 0; i < 1000; i++) {
    const d = computeDna(`t${i}|a`);
    assert.ok(d.lufs >= -19 && d.lufs <= -4, `lufs ${d.lufs} out of range`);
  }
});

test("computeDna key is in KEY_NAMES", () => {
  const d = computeDna("x|y");
  assert.ok(KEY_NAMES.includes(d.key));
  assert.ok(["maj","min"].includes(d.keyMode));
});

import test from "node:test";
import assert from "node:assert";
import { resolveAccentTargets } from "./accentArbiter.js";
import { createInitialState } from "./state.js";

test("default includes lyric", () => {
  const s = createInitialState(100, 30);
  const set = resolveAccentTargets(s, 10000);
  assert.ok(set.has("lyric"));
});

test("transient within 100ms adds sync", () => {
  const s = createInitialState(100, 30);
  s.lastTransientAt = 9950;
  const set = resolveAccentTargets(s, 10000);
  assert.ok(set.has("sync"));
});

test("transient with high energy within 100ms adds bass-bin", () => {
  const s = createInitialState(100, 30);
  s.lastTransientAt = 9950;
  s.transientEnergy = 0.8;
  const set = resolveAccentTargets(s, 10000);
  assert.ok(set.has("bass-bin"));
});

test("transient with low energy does NOT add bass-bin", () => {
  const s = createInitialState(100, 30);
  s.lastTransientAt = 9950;
  s.transientEnergy = 0.3;
  const set = resolveAccentTargets(s, 10000);
  assert.ok(!set.has("bass-bin"));
});

test("clip within 200ms adds clip", () => {
  const s = createInitialState(100, 30);
  s.lastClipAt = 9850;
  const set = resolveAccentTargets(s, 10000);
  assert.ok(set.has("clip"));
});

test("peak within 200ms adds peak", () => {
  const s = createInitialState(100, 30);
  s.lastPeakAt = 9850;
  const set = resolveAccentTargets(s, 10000);
  assert.ok(set.has("peak"));
});

test("expired events do not add targets", () => {
  const s = createInitialState(100, 30);
  s.lastTransientAt = 9800; // 200ms ago > 100ms window
  s.lastClipAt = 9700;      // 300ms ago > 200ms window
  s.lastPeakAt = 9700;
  const set = resolveAccentTargets(s, 10000);
  assert.ok(!set.has("sync"));
  assert.ok(!set.has("clip"));
  assert.ok(!set.has("peak"));
});

test("all can coexist", () => {
  const s = createInitialState(100, 30);
  s.lastTransientAt = 9950;
  s.transientEnergy = 0.9;
  s.lastClipAt = 9850;
  s.lastPeakAt = 9850;
  const set = resolveAccentTargets(s, 10000);
  assert.ok(set.has("lyric"));
  assert.ok(set.has("sync"));
  assert.ok(set.has("bass-bin"));
  assert.ok(set.has("clip"));
  assert.ok(set.has("peak"));
});

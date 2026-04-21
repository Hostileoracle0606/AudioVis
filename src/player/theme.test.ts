import test from "node:test";
import assert from "node:assert";
import { buildTheme, PALETTE_COUNT } from "./theme.js";

test("theme exposes accentBright distinct from accent", () => {
  const t = buildTheme(0, false);
  assert.ok(t.accentBright.length > 0);
  assert.notStrictEqual(t.accentBright, t.accent);
});

test("noColor theme has empty accentBright", () => {
  const t = buildTheme(0, true);
  assert.strictEqual(t.accentBright, "");
});

test("all palettes produce a valid accentBright", () => {
  for (let i = 0; i < PALETTE_COUNT; i++) {
    const t = buildTheme(i, false);
    assert.ok(t.accentBright.length > 0, `palette ${i} missing accentBright`);
  }
});

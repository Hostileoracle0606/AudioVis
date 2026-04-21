import test from "node:test";
import assert from "node:assert";
import { GLYPHS, renderBigLine, GLYPH_H, GLYPH_W } from "./bitfont.js";

test("every glyph is exactly GLYPH_H rows tall", () => {
  for (const [ch, rows] of Object.entries(GLYPHS)) {
    assert.strictEqual(rows.length, GLYPH_H, `glyph '${ch}' has ${rows.length} rows, want ${GLYPH_H}`);
  }
});

test("every glyph row is exactly GLYPH_W cells wide", () => {
  for (const [ch, rows] of Object.entries(GLYPHS)) {
    for (let i = 0; i < rows.length; i++) {
      assert.strictEqual(rows[i].length, GLYPH_W, `glyph '${ch}' row ${i} width ${rows[i].length}, want ${GLYPH_W}`);
    }
  }
});

test("every glyph uses only allowed block characters", () => {
  const allowed = new Set([" ", "\u2588", "\u2593", "\u2592", "\u2591"]);
  for (const [ch, rows] of Object.entries(GLYPHS)) {
    for (const row of rows) {
      for (const c of row) {
        assert.ok(allowed.has(c), `glyph '${ch}' contains disallowed char '${c}' (${c.codePointAt(0)!.toString(16)})`);
      }
    }
  }
});

test("renderBigLine returns GLYPH_H rows with correct width", () => {
  const rows = renderBigLine("AB");
  assert.strictEqual(rows.length, GLYPH_H);
  const expectedWidth = 2 * GLYPH_W + 1; // one space between glyphs
  for (const r of rows) assert.strictEqual(r.length, expectedWidth);
});

test("renderBigLine handles missing glyph by substituting space", () => {
  const rows = renderBigLine("~");
  for (const r of rows) assert.match(r, /^ +$/);
});

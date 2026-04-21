import test from "node:test";
import assert from "node:assert";
import { Renderer } from "../../ui/renderer.js";
import { renderBigLyric, wrapLyric } from "./bigLyric.js";
import { buildTheme } from "../theme.js";

test("wrapLyric word-wraps at whitespace without overflowing maxChars", () => {
  const lines = wrapLyric("CAUSE I'VE BEEN FAKING", 13);
  for (const l of lines) assert.ok(l.length <= 13, `line too long: "${l}" (${l.length})`);
  assert.strictEqual(lines.join(" "), "CAUSE I'VE BEEN FAKING");
});

test("wrapLyric hard-breaks words that exceed maxChars", () => {
  const lines = wrapLyric("ANTIDISESTABLISHMENTARIAN", 6);
  for (const l of lines) assert.ok(l.length <= 6);
  assert.strictEqual(lines.join(""), "ANTIDISESTABLISHMENTARIAN");
});

test("wrapLyric returns [] for maxChars <= 0", () => {
  assert.deepStrictEqual(wrapLyric("anything", 0), []);
});

test("renderBigLyric writes 4 half-block rows at region.y + 1", () => {
  const r = new Renderer(80, 10);
  renderBigLyric(r, { x: 0, y: 1, width: 80, height: 6 }, { text: "HI", bright: false }, buildTheme(0, true));
  const lines = r.debugLines();
  for (let y = 2; y <= 5; y++) {
    const content = lines[y].trim();
    assert.ok(content.length > 0, `row ${y} should have glyph content`);
  }
});

test("renderBigLyric uses accent color by default, accentBright when bright", () => {
  const theme = buildTheme(0, false);
  const r1 = new Renderer(80, 10);
  renderBigLyric(r1, { x: 0, y: 0, width: 80, height: 6 }, { text: "A", bright: false }, theme);
  const r2 = new Renderer(80, 10);
  renderBigLyric(r2, { x: 0, y: 0, width: 80, height: 6 }, { text: "A", bright: true }, theme);
  const raw1 = (r1 as any).cells.join("");
  const raw2 = (r2 as any).cells.join("");
  assert.ok(raw1.includes(theme.accent), "expected accent SGR in default render");
  assert.ok(raw2.includes(theme.accentBright), "expected accentBright SGR in bright render");
});

test("renderBigLyric writes a leading ● marker at region.x", () => {
  const r = new Renderer(80, 10);
  renderBigLyric(r, { x: 2, y: 0, width: 78, height: 6 }, { text: "X", bright: false }, buildTheme(0, true));
  const lines = r.debugLines();
  assert.ok(lines[2].includes("\u25CF"), "expected ● marker on mid row");
});

test("renderBigLyric clips to region width (no overflow into neighbor cells)", () => {
  const r = new Renderer(20, 10);
  renderBigLyric(r, { x: 0, y: 0, width: 20, height: 6 }, { text: "HELLO", bright: false }, buildTheme(0, true));
  const lines = r.debugLines();
  for (const line of lines) {
    assert.ok(line.length === 20, `line length ${line.length} !== 20`);
  }
});

test("renderBigLyric word-wraps long lyric into stacked rows when vertical room allows", () => {
  const r = new Renderer(120, 14);
  // region ~100 cols → maxChars ~ floor(97/7) = 13. Two-word phrase wraps to ≥2 lines.
  renderBigLyric(
    r,
    { x: 0, y: 0, width: 100, height: 12 },
    { text: "CAUSE I'VE BEEN FAKING", bright: false },
    buildTheme(0, true),
  );
  const lines = r.debugLines();
  const glyphRowCount = lines.filter((row) => /[\u2580\u2584\u2588]/.test(row)).length;
  // A single bitfont line = 4 compressed rows. Wrapped multi-line must exceed 4.
  assert.ok(glyphRowCount > 4, `expected >4 rows of glyphs, got ${glyphRowCount}`);
});

test("renderBigLyric does not write past a narrow sub-region into neighbor cells", () => {
  // Renderer is wider than region; nothing should appear at/after x = region.x + region.width.
  const cols = 80;
  const r = new Renderer(cols, 10);
  const regionW = 30;
  renderBigLyric(
    r,
    { x: 0, y: 1, width: regionW, height: 6 },
    { text: "HERE AIN'T A THING", bright: false },
    buildTheme(0, true),
  );
  const lines = r.debugLines();
  for (let y = 0; y < lines.length; y++) {
    const rightSide = lines[y].slice(regionW);
    assert.strictEqual(
      rightSide.trim(),
      "",
      `row ${y}: glyphs leaked past region boundary: "${rightSide}"`,
    );
  }
});

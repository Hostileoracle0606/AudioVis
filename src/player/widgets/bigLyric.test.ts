import test from "node:test";
import assert from "node:assert";
import { Renderer } from "../../ui/renderer.js";
import { renderBigLyric } from "./bigLyric.js";
import { buildTheme } from "../theme.js";

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

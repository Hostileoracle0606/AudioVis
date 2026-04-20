import test from "node:test";
import assert from "node:assert";
import { Renderer } from "./renderer.js";
import { drawOuterFrame, drawHSeparator, drawVDivider } from "./borders.js";

test("drawOuterFrame renders rounded corners and edges", () => {
  const r = new Renderer(6, 4);
  drawOuterFrame(r);
  const lines = r.debugLines();
  assert.strictEqual(lines[0], "\u256D\u2500\u2500\u2500\u2500\u256E"); // ╭────╮
  assert.strictEqual(lines[1], "\u2502    \u2502");                       // │    │
  assert.strictEqual(lines[2], "\u2502    \u2502");
  assert.strictEqual(lines[3], "\u2570\u2500\u2500\u2500\u2500\u256F"); // ╰────╯
});

test("drawHSeparator draws ├─...─┤ with ┬/┴ junctions at specified X", () => {
  const r = new Renderer(10, 3);
  drawOuterFrame(r);
  drawHSeparator(r, 1, { down: [3, 6], up: [] });
  const line = r.debugLines()[1];
  assert.strictEqual(line[0], "\u251C");                      // ├
  assert.strictEqual(line[3], "\u252C");                      // ┬
  assert.strictEqual(line[6], "\u252C");                      // ┬
  assert.strictEqual(line[9], "\u2524");                      // ┤
  assert.ok(!line.includes("\u253C"), "must never produce ┼");
});

test("drawHSeparator handles mixed up/down junctions without ┼", () => {
  const r = new Renderer(12, 3);
  drawOuterFrame(r);
  drawHSeparator(r, 1, { down: [6], up: [3, 9] });
  const line = r.debugLines()[1];
  assert.strictEqual(line[3], "\u2534"); // ┴
  assert.strictEqual(line[6], "\u252C"); // ┬
  assert.strictEqual(line[9], "\u2534"); // ┴
  assert.ok(!line.includes("\u253C"));
});

test("drawVDivider renders │ vertical run", () => {
  const r = new Renderer(5, 5);
  drawOuterFrame(r);
  drawVDivider(r, 2, 1, 3);
  const lines = r.debugLines();
  assert.strictEqual(lines[1][2], "\u2502");
  assert.strictEqual(lines[2][2], "\u2502");
  assert.strictEqual(lines[3][2], "\u2502");
});

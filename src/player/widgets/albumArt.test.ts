import test from "node:test";
import assert from "node:assert";
import { Renderer } from "../../ui/renderer.js";
import { renderAlbumArt } from "./albumArt.js";
import { createInitialState } from "../state.js";
import { buildTheme } from "../theme.js";

test("albumArt shows label in blank mode", () => {
  const r = new Renderer(40, 10);
  const s = createInitialState(40, 10);
  s.artCellMode = "blank";
  renderAlbumArt(r, { x: 0, y: 0, width: 40, height: 10 }, s, buildTheme(0, true));
  assert.ok(r.debugLines().join("\n").includes("ALBUM ART"));
});

test("albumArt renders provided AsciiArt lines in art mode", () => {
  const r = new Renderer(40, 10);
  const s = createInitialState(40, 10);
  s.artCellMode = "art";
  s.albumArt = {
    trackId: "x", thumbnail: [], lines: ["AAAAA", "BBBBB"],
    fullCols: 5, fullRows: 2, playerLines: [], playerCols: 0, playerRows: 0,
    cols: 40, rows: 10, padFingerprint: new Uint8Array(16),
  };
  renderAlbumArt(r, { x: 0, y: 0, width: 40, height: 10 }, s, buildTheme(0, true));
  const lines = r.debugLines();
  assert.ok(lines.some((l) => l.includes("AAAAA")));
  assert.ok(lines.some((l) => l.includes("BBBBB")));
});

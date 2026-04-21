import test from "node:test";
import assert from "node:assert";
import { Renderer } from "../../ui/renderer.js";
import { renderTitleBar } from "./titleBar.js";
import { createInitialState } from "../state.js";
import { buildTheme } from "../theme.js";
import { computeAppLayout } from "../layout.js";

test("titleBar renders brand, search placeholder, and SYS.LOAD", () => {
  const r = new Renderer(120, 40);
  const s = createInitialState(120, 40);
  s.cpuPct = 1.2;
  const t = buildTheme(0, true);
  const L = computeAppLayout(120, 40);
  renderTitleBar(r, L, s, t);
  const line = r.debugLines()[L.titleBar.y];
  assert.ok(line.includes("[ TUI.AMP v4.0 ]"), "expected brand");
  assert.ok(line.includes("SYS.LOAD:"), "expected SYS.LOAD label");
  assert.ok(line.includes("1.2%"), "expected cpu value");
});

test("titleBar shows search query when focused", () => {
  const r = new Renderer(120, 40);
  const s = createInitialState(120, 40);
  s.search.focused = true;
  s.search.query = "justice";
  const L = computeAppLayout(120, 40);
  renderTitleBar(r, L, s, buildTheme(0, true));
  const line = r.debugLines()[L.titleBar.y];
  assert.ok(line.includes("justice"));
  assert.ok(line.includes(">"), "expected search prompt marker");
});

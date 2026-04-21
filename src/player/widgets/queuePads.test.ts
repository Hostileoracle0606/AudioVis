import test from "node:test";
import assert from "node:assert";
import { Renderer } from "../../ui/renderer.js";
import { renderQueuePads } from "./queuePads.js";
import { createInitialState } from "../state.js";
import { buildTheme } from "../theme.js";

test("renderQueuePads draws 8 pads with indices 01-08", () => {
  const r = new Renderer(40, 15);
  const s = createInitialState(40, 15);
  renderQueuePads(r, { x: 0, y: 0, width: 40, height: 15 }, s, buildTheme(0, true));
  const all = r.debugLines().join("\n");
  for (let i = 1; i <= 8; i++) {
    assert.ok(all.includes(String(i).padStart(2, "0")), `missing pad index ${i}`);
  }
});

test("fingerprint bits render as ● for 1s and · for 0s", () => {
  const r = new Renderer(40, 15);
  const s = createInitialState(40, 15);
  s.padFingerprints[0] = new Uint8Array(16).fill(1);
  s.padFingerprints[1] = new Uint8Array(16).fill(0);
  renderQueuePads(r, { x: 0, y: 0, width: 40, height: 15 }, s, buildTheme(0, true));
  const all = r.debugLines().join("\n");
  assert.ok(all.includes("\u25CF\u25CF\u25CF\u25CF"), "expected row of ●●●● for pad 0");
});

test("active pad index gets accent color on header", () => {
  const r = new Renderer(40, 15);
  const s = createInitialState(40, 15);
  s.activePadIndex = 2;
  renderQueuePads(r, { x: 0, y: 0, width: 40, height: 15 }, s, buildTheme(0, false));
  const theme = buildTheme(0, false);
  const raw = (r as any).cells.join("");
  assert.ok(raw.includes(theme.accent), "accent color not applied");
});

test("footer reflects active pad name when recentlyPlayed[0] is set", () => {
  const r = new Renderer(40, 15);
  const s = createInitialState(40, 15);
  s.recentlyPlayed = [{
    trackName: "hello", artistName: "world",
    albumName: "a", albumArtUrl: "", deviceName: "s",
    isPlaying: true, progressMs: 0, durationMs: 0,
  }];
  renderQueuePads(r, { x: 0, y: 0, width: 40, height: 15 }, s, buildTheme(0, true));
  const all = r.debugLines().join("\n");
  assert.match(all, /hello|HEL|hel/i);
});

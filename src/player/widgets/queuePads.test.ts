import test from "node:test";
import assert from "node:assert";
import { Renderer } from "../../ui/renderer.js";
import { renderQueuePads } from "./queuePads.js";
import { createInitialState } from "../state.js";
import { buildTheme } from "../theme.js";

const REGION = { x: 0, y: 0, width: 40, height: 15 };

function setNowPlaying(s: ReturnType<typeof createInitialState>, trackName: string, artistName: string): void {
  s.nowPlaying = {
    trackName, artistName,
    albumName: "a", albumArtUrl: "", deviceName: "s",
    isPlaying: true, progressMs: 0, durationMs: 0,
  };
}

test("renderQueuePads draws 8 pads with indices 01-08", () => {
  const r = new Renderer(40, 15);
  const s = createInitialState(40, 15);
  renderQueuePads(r, REGION, s, buildTheme(0, true));
  const all = r.debugLines().join("\n");
  for (let i = 1; i <= 8; i++) {
    assert.ok(all.includes(String(i).padStart(2, "0")), `missing pad index ${i}`);
  }
});

test("pads contain lit bulbs (●) driven by the beat sequencer", () => {
  const r = new Renderer(40, 15);
  const s = createInitialState(40, 15);
  setNowPlaying(s, "hello", "world");
  s.progressMs = 10_000;
  renderQueuePads(r, REGION, s, buildTheme(0, true));
  const all = r.debugLines().join("\n");
  assert.ok(all.includes("\u25CF"), "expected ≥1 lit bulb in the pad grid");
});

test("active step (derived from progressMs + bpm) uses the bright accent", () => {
  const r = new Renderer(40, 15);
  const s = createInitialState(40, 15);
  setNowPlaying(s, "hello", "world");
  s.progressMs = 60_000;
  const theme = buildTheme(0, true);
  renderQueuePads(r, REGION, s, theme);
  const raw = (r as any).cells.join("");
  assert.ok(raw.includes(theme.accentBright), "active-step bright accent missing");
});

test("header shows the current step counter and bpm", () => {
  const r = new Renderer(40, 15);
  const s = createInitialState(40, 15);
  setNowPlaying(s, "hello", "world");
  s.progressMs = 0;
  renderQueuePads(r, REGION, s, buildTheme(0, true));
  const all = r.debugLines().join("\n");
  assert.match(all, /step\s+\d\d\/08/i);
  assert.match(all, /\d{2,3}bpm/i);
});

test("pads pulse during a recent transient (flashing frame uses the accent)", () => {
  const r = new Renderer(40, 15);
  const s = createInitialState(40, 15);
  setNowPlaying(s, "hello", "world");
  s.progressMs = 5000;
  s.lastTransientAt = Date.now(); // fresh hit
  const theme = buildTheme(0, true);
  renderQueuePads(r, REGION, s, theme);
  const raw = (r as any).cells.join("");
  // Inactive pads get the accent on their frame during a flash window.
  assert.ok(raw.includes(theme.accent), "flashing frame accent missing");
});

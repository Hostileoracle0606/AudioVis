import test from "node:test";
import assert from "node:assert/strict";
import { Renderer } from "../../ui/renderer.js";
import { buildTheme } from "../../ui/theme.js";
import { createInitialState } from "../state.js";
import { getVisualizerMode, isVisualizerMode, VISUALIZER_MODE_ORDER } from "./index.js";
import { renderSkyline } from "./skyline.js";

test("visualizer mode registry includes skyline", () => {
  assert.equal(isVisualizerMode("skyline"), true);
  assert.equal(getVisualizerMode("skyline").label, "Skyline");
  assert.deepEqual(VISUALIZER_MODE_ORDER, ["wavefield", "scroll", "spectrum", "skyline"]);
});

test("renderSkyline produces ASCII buildings above the baseline", () => {
  const state = createInitialState("skyline", 8, 32, 14);
  state.smoothedBuckets = new Float32Array([0.2, 0.55, 0.75, 0.35, 0.9, 0.45, 0.6, 0.25]);
  state.low = 0.65;
  state.mid = 0.5;
  state.high = 0.7;
  state.amplitude = 0.72;
  state.pulse = 0.4;

  const renderer = new Renderer(32, 12);
  const theme = buildTheme(true, false, state.styleProfile);
  const originalNow = Date.now;

  Date.now = () => state.startTime + 1200;
  try {
    renderSkyline(state, renderer, { x: 0, y: 0, width: 32, height: 12 }, theme);
  } finally {
    Date.now = originalNow;
  }

  const frame = renderer.toFrameString().replace("\x1b[H", "");
  assert.match(frame, /_/);
  assert.match(frame, /\|/);
  assert.match(frame, /#/);
});

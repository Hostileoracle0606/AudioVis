import test from "node:test";
import assert from "node:assert/strict";
import { Renderer } from "../../ui/renderer.js";
import { buildTheme } from "../../ui/theme.js";
import { createInitialState } from "../state.js";
import { getVisualizerMode, isVisualizerMode, VISUALIZER_MODE_ORDER } from "./index.js";
import { prepareFire, renderFire } from "./fire.js";
import { renderSkyline } from "./skyline.js";
import { renderTopographic } from "./topographic.js";
import { prepareTunnel, renderTunnel } from "./tunnel.js";

test("visualizer mode registry includes skyline, fire, tunnel, and topographic", () => {
  assert.equal(isVisualizerMode("skyline"), true);
  assert.equal(isVisualizerMode("fire"), true);
  assert.equal(isVisualizerMode("tunnel"), true);
  assert.equal(isVisualizerMode("topographic"), true);
  assert.equal(getVisualizerMode("skyline").label, "Skyline");
  assert.equal(getVisualizerMode("fire").label, "Fire");
  assert.equal(getVisualizerMode("tunnel").label, "Tunnel");
  assert.equal(getVisualizerMode("topographic").label, "Topographic");
  assert.deepEqual(VISUALIZER_MODE_ORDER, [
    "wavefield",
    "scroll",
    "spectrum",
    "skyline",
    "fire",
    "tunnel",
    "topographic",
  ]);
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

test("fire mode renders hot ASCII cells", () => {
  const state = createInitialState("fire", 10, 20, 10);
  state.smoothedBuckets = new Float32Array([0.6, 0.72, 0.8, 0.9, 0.68, 0.74, 0.84, 0.7, 0.62, 0.58]);
  state.low = 0.82;
  state.mid = 0.5;
  state.high = 0.66;
  state.amplitude = 0.88;
  state.pulse = 0.54;

  const renderer = new Renderer(20, 10);
  const theme = buildTheme(true, false, state.styleProfile);
  const originalNow = Date.now;

  Date.now = () => state.startTime + 960;
  try {
    prepareFire(state, { x: 0, y: 0, width: 20, height: 10 });
    renderFire(state, renderer, { x: 0, y: 0, width: 20, height: 10 }, theme);
  } finally {
    Date.now = originalNow;
  }

  const frame = renderer.toFrameString().replace("\x1b[H", "");
  assert.match(frame, /[@%#x:]/);
});

test("tunnel mode renders framed depth rings", () => {
  const state = createInitialState("tunnel", 12, 24, 12);
  state.low = 0.7;
  state.mid = 0.55;
  state.high = 0.62;
  state.amplitude = 0.78;
  state.pulse = 0.4;

  const renderer = new Renderer(24, 12);
  const theme = buildTheme(true, false, state.styleProfile);
  const originalNow = Date.now;

  Date.now = () => state.startTime + 1500;
  try {
    prepareTunnel(state, { x: 0, y: 0, width: 24, height: 12 });
    renderTunnel(state, renderer, { x: 0, y: 0, width: 24, height: 12 }, theme);
  } finally {
    Date.now = originalNow;
  }

  const frame = renderer.toFrameString().replace("\x1b[H", "");
  assert.match(frame, /[\/\\]/);
  assert.match(frame, /[|\-]/);
});

test("topographic mode renders contour lines", () => {
  const state = createInitialState("topographic", 12, 28, 12);
  state.smoothedBuckets = new Float32Array([0.25, 0.42, 0.6, 0.7, 0.86, 0.78, 0.72, 0.56, 0.48, 0.36, 0.28, 0.22]);
  state.low = 0.64;
  state.mid = 0.58;
  state.high = 0.55;
  state.amplitude = 0.74;
  state.pulse = 0.22;

  const renderer = new Renderer(28, 12);
  const theme = buildTheme(true, false, state.styleProfile);
  const originalNow = Date.now;

  Date.now = () => state.startTime + 2100;
  try {
    renderTopographic(state, renderer, { x: 0, y: 0, width: 28, height: 12 }, theme);
  } finally {
    Date.now = originalNow;
  }

  const frame = renderer.toFrameString().replace("\x1b[H", "");
  assert.match(frame, /[\-:=+#]/);
});

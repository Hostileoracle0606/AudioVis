import test from "node:test";
import assert from "node:assert";
import { Renderer } from "../ui/renderer.js";
import { computeAppLayout } from "./layout.js";
import { createInitialState } from "./state.js";
import { buildTheme } from "./theme.js";
import { drawOuterFrame, drawHSeparator, drawVDivider } from "../ui/borders.js";
import { resolveAccentTargets } from "./accentArbiter.js";
import { renderTitleBar } from "./widgets/titleBar.js";
import { renderAlbumArt } from "./widgets/albumArt.js";
import { renderNowPlaying } from "./widgets/nowPlaying.js";
import { renderQueuePads } from "./widgets/queuePads.js";
import { renderLyrics } from "./widgets/lyrics.js";
import { renderSpectrum } from "./widgets/spectrum.js";
import { renderControls } from "./widgets/controls.js";

test("full frame renders without throwing, no cross junctions", () => {
  const cols = 120, rows = 32;
  const r = new Renderer(cols, rows);
  const s = createInitialState(cols, rows);
  s.nowPlaying = {
    trackName: "killer on the loose",
    artistName: "rex vijayan",
    albumName: "killer on the loose",
    albumArtUrl: "",
    deviceName: "s",
    isPlaying: true,
    progressMs: 90_000,
    durationMs: 180_000,
  };
  s.isPlaying = true;
  s.progressMs = 90_000;
  s.durationMs = 180_000;
  s.recentlyPlayed = [s.nowPlaying];
  s.lyrics = [
    { timeMs: 0, text: "killer on the loose" },
    { timeMs: 5000, text: "feeling one with the truth" },
    { timeMs: 10000, text: "wolves on the hill" },
  ];
  s.activeLyricIndex = 1;
  s.meterL = 0.73;
  s.meterR = 0.68;
  s.rms = 0.5;
  s.cpuPct = 19.7;

  const L = computeAppLayout(cols, rows);
  const theme = buildTheme(0, true);
  const accent = resolveAccentTargets(s, Date.now());

  drawOuterFrame(r);
  drawHSeparator(r, L.sep1Y, { down: L.sep1Down, up: [] });
  drawHSeparator(r, L.sep2Y, { down: L.sep2Down, up: L.sep2Up });
  drawHSeparator(r, L.sep3Y, { down: [], up: L.sep3Up });
  drawVDivider(r, L.sep1Down[0], L.topRow.y, L.topRow.y + L.topRow.height - 1);
  drawVDivider(r, L.sep1Down[1], L.topRow.y, L.topRow.y + L.topRow.height - 1);
  drawVDivider(r, L.sep2Down[0], L.middleRow.y, L.middleRow.y + L.middleRow.height - 1);

  renderTitleBar(r, L, s, theme, accent);
  renderAlbumArt(r, L.screenR, s, theme);
  renderNowPlaying(r, L.nowR, s, theme);
  renderQueuePads(r, L.padsR, s, theme);
  renderLyrics(r, L.lyricsR, s, theme, accent);
  renderSpectrum(r, L.spectrumR, s, theme, accent);
  renderControls(r, L, s, theme);

  const lines = r.debugLines();
  const joined = lines.join("\n");

  assert.ok(!joined.includes("\u253C"), "unexpected \u253C cross in frame");

  for (const label of ["TUI\u00B7AMP", "screen \u00B7", "now \u00B7 track", "pads \u00B7 step", "lyrics", "spectrum"]) {
    assert.ok(joined.includes(label), `missing label ${JSON.stringify(label)}`);
  }

  for (let y = 0; y < rows; y++) {
    assert.strictEqual(lines[y].length, cols, `row ${y} length ${lines[y].length}`);
  }
});

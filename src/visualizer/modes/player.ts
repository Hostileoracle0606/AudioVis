/**
 * Player mode — Teenage-Engineering-styled record player + side module.
 *
 * Composition (back → front):
 *   1. dim background plate (wavefield / scroll / spectrum at ~15%)
 *   2. record-player chassis (left pane)
 *   3. lyrics + waveform side module (right pane)
 *   4. centred floating search frame
 *
 * Design rules (see docs/player-mode-design.md):
 *   - lowercase labels, thin rounded frames, one accent per frame
 *   - chassis/turntable/controls = direct cell writes
 *   - screen sub-panel = album art via ansilize
 */

import type { VisState } from "../state.js";
import type { Renderer } from "../../ui/renderer.js";
import type { Theme } from "../../ui/theme.js";
import type { Region, PlayerLayout } from "../../ui/layout.js";
import { computePlayerLayout } from "../../ui/layout.js";
import { renderWavefield } from "./wavefield.js";
import { renderScroll } from "./scroll.js";
import { renderSpectrum } from "./spectrum.js";
import { formatSeconds, truncateMiddle, centerPad } from "../../ui/format.js";
import { hashTrackId } from "../songTheme.js";

// ── Helpers ───────────────────────────────────────────────────────────────

function styled(s: string, colour: string, reset: string): string {
  return colour ? colour + s + reset : s;
}

function drawRoundedBox(
  renderer: Renderer,
  region: Region,
  label: string,
  colour: string,
  reset: string
): void {
  const { x, y, width: W, height: H } = region;
  if (W < 4 || H < 2) return;

  // Top border with centred label "─ label ─"
  const labelTxt = label ? ` ${label} ` : "";
  const dashes = Math.max(0, W - 2 - labelTxt.length);
  const leftDash = Math.floor(dashes / 2);
  const rightDash = dashes - leftDash;
  const topInner =
    "\u2500".repeat(leftDash) + labelTxt + "\u2500".repeat(rightDash);
  renderer.write(x, y, styled(`\u256D${topInner}\u256E`, colour, reset));

  // Sides
  for (let r = 1; r < H - 1; r++) {
    renderer.write(x, y + r, styled("\u2502", colour, reset));
    renderer.write(x + W - 1, y + r, styled("\u2502", colour, reset));
  }

  // Bottom
  const bottomInner = "\u2500".repeat(Math.max(0, W - 2));
  renderer.write(x, y + H - 1, styled(`\u2570${bottomInner}\u256F`, colour, reset));
}

/**
 * Overwrite every cell in `region` with a space.  Needed because the renderer
 * stores one char per cell — when chrome writes land in the middle of a
 * background plate's ANSI escape sequence, the sequence breaks.  Clearing
 * the region first ensures chrome writes start from a clean slate.
 */
function clearRegion(renderer: Renderer, region: Region, resetCell: string): void {
  for (let r = 0; r < region.height; r++) {
    const row = region.y + r;
    // Begin each row with a reset so the previous row's colour doesn't bleed
    // into this one when the joined frame hits the terminal.
    renderer.write(region.x, row, resetCell + " ".repeat(Math.max(0, region.width - 1)));
  }
}

function clampRegion(inner: Region, parent: Region): Region {
  const x = Math.max(parent.x, inner.x);
  const y = Math.max(parent.y, inner.y);
  const w = Math.max(0, Math.min(inner.x + inner.width, parent.x + parent.width) - x);
  const h = Math.max(0, Math.min(inner.y + inner.height, parent.y + parent.height) - y);
  return { x, y, width: w, height: h };
}

// ── Background plate ──────────────────────────────────────────────────────
// Re-renders the selected legacy mode into the full region, but with the
// state's amplitude fields zeroed-ish and the theme swapped to a dim-only
// palette so it reads as a muted backdrop rather than competing for the eye.

function renderBackgroundPlate(state: VisState, renderer: Renderer, region: Region, theme: Theme): void {
  const dimTheme: Theme = {
    ...theme,
    // Force every ANSI style to the dim one so accents/brights vanish.
    dim: theme.dim,
    normal: theme.dim,
    bright: theme.dim,
  };

  // Clone song theme with all tiers collapsed to `dim`, for the same reason.
  const dimSong = { ...state.songTheme };
  dimSong.normal = state.songTheme.dim;
  dimSong.bright = state.songTheme.dim;
  dimSong.accent = state.songTheme.dim;

  const dimState: VisState = {
    ...state,
    amplitude: state.amplitude * 0.18,
    low:       state.low       * 0.18,
    mid:       state.mid       * 0.18,
    high:      state.high      * 0.18,
    pulse:     0,
    songTheme: dimSong,
    // Suppress beat effects on the plate.
    lastPulseStrength: 0,
    ringQueue: [],
    particles: [],
  };

  switch (state.backgroundMode) {
    case "scroll":   renderScroll(dimState, renderer, region, dimTheme); break;
    case "spectrum": renderSpectrum(dimState, renderer, region, dimTheme); break;
    default:         renderWavefield(dimState, renderer, region, dimTheme); break;
  }
}

// ── Turntable ─────────────────────────────────────────────────────────────

function renderTurntable(
  state: VisState,
  renderer: Renderer,
  region: Region
): void {
  const song = state.songTheme;
  const cx = region.x + Math.floor(region.width / 2);
  const cy = region.y + Math.floor(region.height / 2);
  // Platter radius — ovalised to compensate for ~2:1 char aspect ratio.
  const rX = Math.max(4, Math.floor(region.width * 0.42));
  const rY = Math.max(2, Math.floor(region.height * 0.42));

  // Rotation phase for the single accent pip riding the outer edge.
  // 33⅓ rpm → one revolution every ~1.8s.  platterPhase already wraps.
  const pipAngle = state.isPlaying ? state.platterPhase * Math.PI * 2 : 0;
  const pipX = cx + Math.round(Math.cos(pipAngle) * rX);
  const pipY = cy + Math.round(Math.sin(pipAngle) * rY);

  // Outer platter edge — dotted ellipse.
  const STEPS = 48;
  for (let i = 0; i < STEPS; i++) {
    const t = (i / STEPS) * Math.PI * 2;
    const px = cx + Math.round(Math.cos(t) * rX);
    const py = cy + Math.round(Math.sin(t) * rY);
    if (px < region.x || px >= region.x + region.width) continue;
    if (py < region.y || py >= region.y + region.height) continue;
    renderer.write(px, py, styled("\u00B7", song.dim, song.reset));
  }

  // Groove rings — 4 concentric dashed ellipses between outer and label.
  const labelRX = Math.max(3, Math.floor(rX * 0.34));
  const labelRY = Math.max(1, Math.floor(rY * 0.45));
  const grooves = 4;
  for (let g = 1; g <= grooves; g++) {
    const frac = g / (grooves + 1);
    const gRX = Math.round(labelRX + (rX - labelRX) * (1 - frac));
    const gRY = Math.max(labelRY + 1, Math.round(labelRY + (rY - labelRY) * (1 - frac)));
    const gSteps = Math.max(24, gRX * 4);
    for (let i = 0; i < gSteps; i++) {
      if (i % 2 === 0) continue; // dashed
      const t = (i / gSteps) * Math.PI * 2;
      const px = cx + Math.round(Math.cos(t) * gRX);
      const py = cy + Math.round(Math.sin(t) * gRY);
      if (px < region.x || px >= region.x + region.width) continue;
      if (py < region.y || py >= region.y + region.height) continue;
      renderer.write(px, py, styled("\u2500", song.dim, song.reset));
    }
  }

  // Label (rounded inner box) — rendered on top of the grooves.
  const labelW = Math.min(region.width - 4, labelRX * 2 + 1);
  const labelH = Math.min(region.height - 4, labelRY * 2 + 1);
  if (labelW >= 8 && labelH >= 3) {
    const lx = cx - Math.floor(labelW / 2);
    const ly = cy - Math.floor(labelH / 2);
    const labelRegion: Region = { x: lx, y: ly, width: labelW, height: labelH };
    // Clear interior first — overwrites any groove chars we'd cross.
    for (let r = 0; r < labelH; r++) {
      for (let c = 0; c < labelW; c++) {
        renderer.write(lx + c, ly + r, " ");
      }
    }
    drawRoundedBox(renderer, labelRegion, "", song.dim, song.reset);
    // Label contents — up to 3 short lines.
    const trackNum = state.currentTrackId
      ? String(hashTrackId(state.currentTrackId) % 1000).padStart(3, "0")
      : "000";
    const innerY = ly + 1;
    const innerX = lx + 2;
    const innerW = labelW - 4;
    const lines = [
      centerPad("side a", innerW).slice(0, innerW),
      centerPad(`\u2756 \u00B7 33\u2153`, innerW).slice(0, innerW),
      centerPad(`track ${trackNum}`, innerW).slice(0, innerW),
    ];
    for (let i = 0; i < Math.min(lines.length, labelH - 2); i++) {
      renderer.write(innerX, innerY + i, styled(lines[i], song.dim, song.reset));
    }
  }

  // Spindle — dead centre.
  renderer.write(cx, cy, styled("\u2756", song.dim, song.reset));

  // Rotation accent pip — the ONLY accent glyph on the turntable.
  if (state.isPlaying) {
    const colour = song.accent || song.bright;
    if (pipX >= region.x && pipX < region.x + region.width &&
        pipY >= region.y && pipY < region.y + region.height) {
      renderer.write(pipX, pipY, styled("\u25CF", colour, song.reset));
    }
  }
}

// ── Tonearm ───────────────────────────────────────────────────────────────

function renderTonearm(
  state: VisState,
  renderer: Renderer,
  region: Region
): void {
  const song = state.songTheme;
  // Pivot at upper-right, just outside the platter.
  const pivotX = region.x + region.width - 3;
  const pivotY = region.y + 2;
  const cx = region.x + Math.floor(region.width / 2);
  const cy = region.y + Math.floor(region.height / 2);
  const rX = Math.max(4, Math.floor(region.width * 0.42));
  const rY = Math.max(2, Math.floor(region.height * 0.42));

  // Progress 0 → arm parked off platter; 1 → arm near label (centre).
  const progress =
    state.durationMs > 0 ? Math.max(0, Math.min(1, state.progressMs / state.durationMs)) : 0;
  // Target cartridge position: outer edge → inner edge of grooves.
  const targetAngle = Math.PI * (0.05 + (1 - progress) * 0.35); // 9° → 72° sweep
  const targetR = {
    x: rX * (0.55 + progress * 0.35),
    y: rY * (0.55 + progress * 0.35),
  };
  const cartX = cx + Math.round(Math.cos(targetAngle) * targetR.x);
  const cartY = cy - Math.round(Math.sin(targetAngle) * targetR.y);

  // Pivot glyph.
  if (pivotX < region.x + region.width && pivotY < region.y + region.height) {
    renderer.write(pivotX, pivotY, styled("\u25EF", song.normal, song.reset));
  }

  // Arm — sample along the pivot→cartridge line, draw ╱ glyphs.
  const dx = cartX - pivotX;
  const dy = cartY - pivotY;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = Math.round(pivotX + dx * t);
    const y = Math.round(pivotY + dy * t);
    if (x < region.x || x >= region.x + region.width) continue;
    if (y < region.y || y >= region.y + region.height) continue;
    renderer.write(x, y, styled("\u2571", song.normal, song.reset));
  }

  // Cartridge — the one accent in this block when playing.
  const cartColour = state.isPlaying ? (song.accent || song.bright) : song.dim;
  if (cartX >= region.x && cartX < region.x + region.width &&
      cartY >= region.y && cartY < region.y + region.height) {
    renderer.write(cartX, cartY, styled("\u2590", cartColour, song.reset));
  }
}

// ── Screen (album art) ────────────────────────────────────────────────────

function renderScreen(
  state: VisState,
  renderer: Renderer,
  region: Region
): void {
  const song = state.songTheme;
  drawRoundedBox(renderer, region, "screen", song.dim, song.reset);
  const innerX = region.x + 1;
  const innerY = region.y + 1;
  const innerW = region.width - 2;
  const innerH = region.height - 2;
  if (innerW <= 0 || innerH <= 0) return;

  if (state.albumArt && state.albumArt.playerLines.length > 0) {
    const lines = state.albumArt.playerLines;
    const artW = state.albumArt.playerCols;
    const artH = Math.min(lines.length, innerH);
    const yOff = Math.floor((innerH - artH) / 2);
    const xOff = Math.max(0, Math.floor((innerW - artW) / 2));
    for (let i = 0; i < artH; i++) {
      renderer.write(innerX + xOff, innerY + yOff + i, lines[i]);
    }
  } else {
    // Placeholder wordmark.
    const mark = "audio\u00B7vis";
    const cy = innerY + Math.floor(innerH / 2);
    const cx = innerX + Math.max(0, Math.floor((innerW - mark.length) / 2));
    renderer.write(cx, cy, styled(mark, song.dim, song.reset));
  }
}

// ── Grille ────────────────────────────────────────────────────────────────

function renderGrille(
  state: VisState,
  renderer: Renderer,
  region: Region,
  now: number
): void {
  const song = state.songTheme;
  drawRoundedBox(renderer, region, "", song.dim, song.reset);
  const innerX = region.x + 1;
  const innerY = region.y + 1;
  const innerW = region.width - 2;
  const innerH = region.height - 2;
  if (innerW <= 0 || innerH <= 0) return;

  // Trigger a new row flash on fresh pulses.
  if (state.lastPulseMs > state.grillePulseUntilMs - 200 &&
      now - state.lastPulseMs < 80 &&
      state.lastPulseStrength > 0.4) {
    state.grillePulseRow = Math.floor(Math.random() * innerH);
    state.grillePulseUntilMs = now + 200;
  }
  const flashing = now < state.grillePulseUntilMs;

  for (let r = 0; r < innerH; r++) {
    const isHot = flashing && r === state.grillePulseRow;
    const colour = isHot ? (song.bright || song.normal) : song.dim;
    // Repeat `)))` triads across the row, with a leading space.
    let line = "";
    for (let c = 0; c < innerW; c++) {
      const m = c % 4;
      line += (m === 3) ? " " : ")";
    }
    renderer.write(innerX, innerY + r, styled(line, colour, song.reset));
  }
}

// ── Progress strip ────────────────────────────────────────────────────────

function renderProgressStrip(
  state: VisState,
  renderer: Renderer,
  region: Region
): void {
  const song = state.songTheme;
  const trackNum = state.currentTrackId
    ? String(hashTrackId(state.currentTrackId) % 1000).padStart(3, "0")
    : "000";
  const elapsed = formatSeconds(state.progressMs / 1000);
  const total   = formatSeconds(state.durationMs / 1000);
  const bpmStr  = state.songFeatures.confidence > 0.3 && state.songFeatures.bpm > 0
    ? `${state.songFeatures.bpm.toFixed(0)} bpm`
    : "— bpm";
  const fields = [
    `track ${trackNum}`,
    bpmStr,
    `${elapsed} / ${total}`,
    `33\u2153 rpm`,
  ];
  const sep = " \u00B7 \u00B7 ";
  const line = `\u00B7\u00B7 ${fields.join(sep)} \u00B7\u00B7`;
  const trimmed = line.length > region.width ? line.slice(0, region.width) : line;
  const x = region.x + Math.max(0, Math.floor((region.width - trimmed.length) / 2));
  // Mostly dim; promote the elapsed-time slot to normal.
  renderer.write(x, region.y, styled(trimmed, song.dim, song.reset));
}

// ── Controls ──────────────────────────────────────────────────────────────

function renderControls(
  state: VisState,
  renderer: Renderer,
  region: Region
): void {
  const song = state.songTheme;
  const playGlyph = state.isPlaying ? "\u25B7 play " : "\u25AF\u25AF pause";
  const left = "\u00B7 rec";
  const mid1 = "\u25C9 speed";
  const mid2 = "\u25C9 line";
  const right = playGlyph;

  const pad = Math.max(1, Math.floor((region.width - (left.length + mid1.length + mid2.length + right.length)) / 4));
  let cursor = region.x + Math.max(1, Math.floor(pad / 2));
  for (const seg of [left, mid1, mid2, right]) {
    const colour = seg === right && state.isPlaying ? song.normal : song.dim;
    if (cursor + seg.length <= region.x + region.width) {
      renderer.write(cursor, region.y, styled(seg, colour, song.reset));
    }
    cursor += seg.length + pad;
  }
}

// ── Chassis composition ───────────────────────────────────────────────────

function renderChassis(
  state: VisState,
  renderer: Renderer,
  region: Region,
  now: number
): void {
  const song = state.songTheme;
  const trackNum = state.currentTrackId
    ? String(hashTrackId(state.currentTrackId) % 1000).padStart(3, "0")
    : "042";
  drawRoundedBox(renderer, region, `audio\u00B7vis \u25E6 ${trackNum}`, song.dim, song.reset);

  const ix = region.x + 2;
  const iy = region.y + 1;
  const iw = region.width - 4;
  const ih = region.height - 2;
  if (iw < 16 || ih < 3) return;

  // Knob labels (top corners of interior).
  renderer.write(ix, iy, styled("\u25C9 tempo", song.dim, song.reset));
  const volLabel = "\u25C9 volume";
  renderer.write(ix + iw - volLabel.length, iy, styled(volLabel, song.dim, song.reset));

  // Fixed-cost rows at the bottom of the chassis: progress strip + controls.
  // Draw these first so we know how much height remains for turntable/screen.
  const controlsY = region.y + region.height - 2;
  const progressY = controlsY - 1;
  renderProgressStrip(state, renderer, { x: ix, y: progressY, width: iw, height: 1 });
  renderControls(state, renderer, { x: ix, y: controlsY, width: iw, height: 1 });

  // Everything between knob row and progress row is shared between the
  // turntable and the screen+grille pair.  Prefer turntable when height
  // is tight — the deck IS the identity of player mode.
  const midTop = iy + 1;
  const midBottom = progressY - 1;
  const midH = Math.max(0, midBottom - midTop + 1);
  if (midH < 3) return;

  if (midH >= 10) {
    // Roomy: turntable on top (~60%), screen + grille beneath.
    const platterH = Math.max(5, Math.floor(midH * 0.6));
    const platterRegion: Region = { x: ix, y: midTop, width: iw, height: platterH };
    renderTurntable(state, renderer, platterRegion);
    renderTonearm(state, renderer, platterRegion);

    const subY = midTop + platterH + 1;
    const subH = midBottom - subY + 1;
    if (subH >= 3 && iw >= 36) {
      const screenW = Math.floor(iw * 0.58);
      const grilleW = iw - screenW - 2;
      renderScreen(state, renderer, clampRegion({ x: ix, y: subY, width: screenW, height: subH }, region));
      renderGrille(state, renderer, clampRegion({ x: ix + screenW + 2, y: subY, width: grilleW, height: subH }, region), now);
    } else if (subH >= 3) {
      renderScreen(state, renderer, clampRegion({ x: ix, y: subY, width: iw, height: subH }, region));
    }
  } else {
    // Tight: everything shrinks to fit the available middle band.
    renderTurntable(state, renderer, { x: ix, y: midTop, width: iw, height: midH });
    renderTonearm(state, renderer, { x: ix, y: midTop, width: iw, height: midH });
  }
}

// ── Side module ───────────────────────────────────────────────────────────

function ensureLyricsLines(state: VisState): string[] {
  // For v1: metadata marquee.  lrclib integration is a follow-up.
  if (state.lyricsLines.length === 0 || state.lyricsLines[0] !== state.trackName) {
    const lines: string[] = [];
    if (state.trackName)  lines.push(state.trackName);
    if (state.artistName) lines.push(state.artistName);
    if (state.albumName)  lines.push(state.albumName);
    lines.push(state.isPlaying ? "now playing" : "paused");
    if (state.deviceName) lines.push(`\u00B7 ${state.deviceName}`);
    state.lyricsLines = lines.length > 0 ? lines : ["audio\u00B7vis"];
  }
  return state.lyricsLines;
}

function renderLyricsPanel(
  state: VisState,
  renderer: Renderer,
  region: Region,
  now: number
): void {
  const song = state.songTheme;
  drawRoundedBox(renderer, region, "lyrics", song.dim, song.reset);
  const innerX = region.x + 2;
  const innerY = region.y + 1;
  const innerW = region.width - 4;
  const innerH = region.height - 2;
  if (innerW <= 0 || innerH <= 0) return;

  const lines = ensureLyricsLines(state);

  // Advance marquee every 4s.
  if (now - state.lyricsCycleMs > 4000) {
    state.lyricsCycleMs = now;
    state.lyricsIdx = (state.lyricsIdx + 1) % lines.length;
  }

  for (let i = 0; i < Math.min(innerH, lines.length); i++) {
    const idx = (state.lyricsIdx + i) % lines.length;
    const text = truncateMiddle(lines[idx], innerW - 2);
    const isCurrent = i === 1 && innerH >= 3; // middle-ish line is "current"
    const prefix = isCurrent ? "\u2756 " : "\u00B7 ";
    const colour = isCurrent ? (song.bright || song.normal) : song.dim;
    renderer.write(innerX, innerY + i, styled(prefix + text, colour, song.reset));
  }
}

function renderWavePanel(
  state: VisState,
  renderer: Renderer,
  region: Region
): void {
  const song = state.songTheme;
  drawRoundedBox(renderer, region, "waveform", song.dim, song.reset);
  const innerX = region.x + 1;
  const innerY = region.y + 1;
  const innerW = region.width - 2;
  const innerH = region.height - 2;
  if (innerW <= 0 || innerH <= 0) return;

  const midY = innerY + Math.floor(innerH / 2);
  const amp = Math.max(0.1, state.amplitude);
  const phase = state.sideWavePhase * Math.PI * 2;

  // Three overlapping sines — different spatial frequencies & amplitudes.
  for (let c = 0; c < innerW; c++) {
    const x = c / Math.max(1, innerW - 1);
    const s1 = Math.sin(x * Math.PI * 2 + phase) * amp;
    const s2 = Math.sin(x * Math.PI * 4 + phase * 1.7) * amp * 0.55;
    const s3 = Math.sin(x * Math.PI * 7 + phase * 2.3) * amp * 0.3;
    const mixed = (s1 + s2 + s3) / 1.85; // keep within ~[-1,1]
    const row = midY - Math.round(mixed * Math.max(1, Math.floor(innerH / 2) - 1));
    if (row >= innerY && row < innerY + innerH) {
      // Pick glyph from density ramp by crest sharpness.
      const ramp = song.densityRamp;
      const idx = Math.min(ramp.length - 2, Math.floor(Math.abs(mixed) * (ramp.length - 2)));
      const ch = ramp[idx] || "~";
      // Colour tier: outer dim, middle normal, crest bright/accent.
      let colour = song.dim;
      if (Math.abs(mixed) > 0.55) colour = song.bright || song.normal;
      else if (Math.abs(mixed) > 0.25) colour = song.normal;
      renderer.write(innerX + c, row, styled(ch, colour, song.reset));
    }
  }

  // Beat flash — one-row sweep across on the most recent pulse.
  const beatAge = Date.now() - state.lastPulseMs;
  if (beatAge < 120 && state.lastPulseStrength > 0.3) {
    const accent = song.accent || song.bright;
    for (let c = 0; c < innerW; c += 2) {
      renderer.write(innerX + c, midY, styled("\u2015", accent, song.reset));
    }
  }
}

function renderSideModule(
  state: VisState,
  renderer: Renderer,
  region: Region,
  now: number
): void {
  if (region.height < 8) {
    renderLyricsPanel(state, renderer, region, now);
    return;
  }
  const lyricsH = Math.floor(region.height * 0.55);
  const waveH = region.height - lyricsH;
  renderLyricsPanel(state, renderer, { ...region, height: lyricsH }, now);
  renderWavePanel(state, renderer, { x: region.x, y: region.y + lyricsH, width: region.width, height: waveH });
}

// ── Search field ──────────────────────────────────────────────────────────

function renderSearchField(
  state: VisState,
  renderer: Renderer,
  region: Region
): void {
  const song = state.songTheme;
  const colour = state.searchFocused ? (song.bright || song.normal) : song.dim;
  drawRoundedBox(renderer, region, "search", colour, song.reset);
  const innerX = region.x + 2;
  const innerY = region.y + 1;
  const innerW = region.width - 4;
  if (innerW <= 0) return;

  const text = state.searchQuery || "\u00B7 \u00B7 \u00B7  ready";
  const caret = state.searchFocused ? "\u258C" : "";
  const shown = truncateMiddle(text, Math.max(1, innerW - caret.length));
  renderer.write(innerX, innerY, styled(shown + caret, colour, song.reset));

  // Right-side hint "q"
  const hint = " q ";
  const hintX = region.x + region.width - 1 - hint.length;
  if (hintX > innerX + shown.length) {
    renderer.write(hintX, region.y, styled(hint, colour, song.reset));
  }
}

// ── Per-frame state ticking ───────────────────────────────────────────────

function tickPlayerState(state: VisState, now: number): void {
  // Platter rotation — 33⅓ rpm scaled; freeze on pause.
  if (state.isPlaying) {
    const period = 1800; // ms per revolution (slowed for readability)
    state.platterPhase = ((now % period) / period) % 1;
    state.sideWavePhase = ((now % 2400) / 2400) % 1;
  }
}

// ── Entry point ───────────────────────────────────────────────────────────

export function renderPlayer(
  state: VisState,
  renderer: Renderer,
  region: Region,
  theme: Theme
): void {
  const now = Date.now();
  tickPlayerState(state, now);

  const layout: PlayerLayout = computePlayerLayout(region);

  // Background plate — always drawn first, in the full region.
  renderBackgroundPlate(state, renderer, region, theme);

  if (layout.collapsed) {
    // Fall back to just the background plate + a small header.
    const song = state.songTheme;
    const msg = "narrow \u00B7 player mode hidden";
    const row = region.y + 1;
    renderer.write(region.x + 2, row, styled(msg, song.dim, song.reset));
    return;
  }

  // Clear the chrome regions before drawing chassis / side / search so the
  // plate's multi-char ANSI sequences don't leave orphaned escape fragments
  // behind sparse chrome writes.
  const reset = state.songTheme.reset;
  clearRegion(renderer, layout.chassis, reset);
  clearRegion(renderer, layout.side,    reset);
  clearRegion(renderer, layout.search,  reset);

  renderChassis(state, renderer, layout.chassis, now);
  renderSideModule(state, renderer, layout.side, now);
  renderSearchField(state, renderer, layout.search);
}

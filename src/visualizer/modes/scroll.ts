/**
 * Scrolling waveform visualizer mode.
 *
 * Maintains a ring buffer of amplitude values — one per visible column —
 * that scrolls left each render frame.  On top of the waveform we run a
 * physics-driven particle system that spawns bursts on beat onsets and
 * emits a gentle shower on tempo-grid peaks, so even between beats the
 * display feels alive and the density of emission tells you about the
 * song's energy.
 */

import type { VisState, Particle } from "../state.js";
import type { Renderer } from "../../ui/renderer.js";
import type { Theme } from "../../ui/theme.js";
import type { Region } from "../../ui/layout.js";

const MAX_PARTICLES = 140;

export function pushScrollHistory(state: VisState, width: number): void {
  if (state.scrollHistory.length !== width) {
    state.scrollHistory = new Float32Array(width);
    return;
  }
  state.scrollHistory.copyWithin(0, 1);
  state.scrollHistory[width - 1] = state.amplitude;
}

// Linear-congruential PRNG seeded per-call — stable enough for tight loops
// and avoids thrashing Math.random() which some JS engines don't inline.
function lcg(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

export function renderScroll(
  state: VisState,
  renderer: Renderer,
  region: Region,
  theme: Theme
): void {
  const W = region.width;
  const H = region.height;
  const cy = Math.floor(H / 2);
  const halfH = Math.max(1, cy - 1);

  const ascii = !theme.colorEnabled || theme.palette.length <= 5;
  const song = state.songTheme;
  const feats = state.songFeatures;

  const now = Date.now();
  const dt = Math.min(1 / 15, (state as { lastScrollMs?: number }).lastScrollMs
    ? (now - (state as { lastScrollMs?: number }).lastScrollMs!) / 1000
    : 1 / 30);
  (state as { lastScrollMs?: number }).lastScrollMs = now;

  // ── Beat gating ───────────────────────────────────────────────────────────
  const beatAge = (now - state.lastPulseMs) / 1000;
  const beatFlash = Math.max(0, 1 - beatAge / 0.25) * state.lastPulseStrength;

  // ── Particle spawn ────────────────────────────────────────────────────────
  // Two sources of spawn:
  //   1. Beat onset → big radial burst from the leading edge.
  //   2. Continuous sprinkle proportional to (high × amplitude) with a
  //      tempo-phase gate that nudges spawn toward the top of each beat.
  const spawnSeed = (song.seed ^ Math.floor(now / 50)) >>> 0;
  const rand = lcg(spawnSeed);

  // Beat burst
  if (beatAge < 0.04 && state.particles.length < MAX_PARTICLES) {
    const burstCount = Math.floor(6 + state.lastPulseStrength * 18);
    for (let i = 0; i < burstCount && state.particles.length < MAX_PARTICLES; i++) {
      // Angle weighted upward (ceiling of emission cone) so particles climb.
      const angle = -Math.PI / 2 + (rand() - 0.5) * 1.6;
      const speed = 6 + rand() * 18;
      state.particles.push({
        x: W - 2 + rand() * 2,
        y: cy + (rand() - 0.5) * 2,
        vx: Math.cos(angle) * speed - 2, // slight leftward drift with scroll
        vy: Math.sin(angle) * speed,
        life: 1,
        lifeDecay: 0.9 + rand() * 0.8,
        glyph: rand() < 0.3 ? song.sparkleGlyph : song.ringGlyph,
      });
    }
  }

  // Tempo-phase sprinkle — denser near the crest of each beat cycle.
  const phaseGate = Math.pow(Math.max(0, Math.cos((feats.tempoPhase - 0) * Math.PI * 2)), 3);
  const sprinkleRate = (state.high * 0.8 + state.amplitude * 0.4) * (0.3 + phaseGate * 0.7);
  // Rate is "particles per second" expected — multiply by dt and use rand.
  const expectedSpawns = sprinkleRate * 30 * dt;
  let spawnsLeft = expectedSpawns;
  while (spawnsLeft > 0 && state.particles.length < MAX_PARTICLES) {
    if (spawnsLeft < 1 && rand() > spawnsLeft) break;
    spawnsLeft -= 1;
    const col = Math.floor(W - 4 + rand() * 4);
    const amp = state.scrollHistory[col] ?? 0;
    const spawnY = cy - amp * halfH * (rand() < 0.5 ? 1 : -1);
    state.particles.push({
      x: col,
      y: spawnY,
      vx: -1 - rand() * 2,
      vy: (rand() - 0.7) * 6, // mostly upward
      life: 1,
      lifeDecay: 1.3 + rand(),
      glyph: rand() < 0.5 ? song.sparkleGlyph : ".",
    });
  }

  // ── Particle update ───────────────────────────────────────────────────────
  const next: Particle[] = [];
  for (const p of state.particles) {
    p.life -= p.lifeDecay * dt;
    if (p.life <= 0) continue;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    // Particles accelerate with a bit of gravity-like pull back toward
    // the centre row, and with scroll-speed leftward drift.  This way
    // sparks arc in a convincing way.
    p.vy += (p.y < cy ? 1 : -1) * 3 * dt * 0.5;
    p.vx -= 2 * dt; // scroll drift left
    if (p.x < 0 || p.x >= W) continue;
    if (p.y < 0 || p.y >= H) continue;
    next.push(p);
  }
  state.particles = next;

  // ── Render main waveform ──────────────────────────────────────────────────
  for (let col = 0; col < W; col++) {
    const amp = state.scrollHistory[col] ?? 0;
    const barH = Math.round(amp * halfH);
    const age = 1 - col / Math.max(1, W - 1); // 0=oldest, 1=newest
    const isLeadingEdge = col >= W - 3;

    if (barH === 0) {
      const ch = ascii ? "-" : "\u2014";
      const cell = theme.colorEnabled
        ? (age < 0.3 ? song.dim : song.normal) + ch + song.reset
        : ch;
      renderer.write(col, region.y + cy, cell);
      continue;
    }

    for (let dr = -barH; dr <= barH; dr++) {
      const row = cy + dr;
      if (row < 0 || row >= H) continue;
      const frac = Math.abs(dr) / barH;

      // Pull glyphs from the song-theme density ramp so each track has
      // its own waveform "texture".  Densest at centre, airier at edges.
      let ch: string;
      if (ascii) {
        ch = frac < 0.30 ? "#" : frac < 0.65 ? ":" : ".";
      } else {
        const ramp = song.densityRamp;
        const idx = Math.min(ramp.length - 2, Math.floor(frac * (ramp.length - 1)));
        ch = ramp[idx] || "\u2588";
      }

      let cell = ch;
      if (theme.colorEnabled) {
        if (isLeadingEdge || (frac < 0.2 && age > 0.55)) {
          cell = song.accent + ch + song.reset;
        } else if (frac < 0.25 && age > 0.3) {
          cell = song.bright + ch + song.reset;
        } else if (age < 0.2 || frac > 0.75) {
          cell = song.dim + ch + song.reset;
        } else {
          cell = song.normal + ch + song.reset;
        }
      }

      renderer.write(col, region.y + row, cell);
    }
  }

  // ── Render particles on top ───────────────────────────────────────────────
  for (const p of state.particles) {
    const col = Math.round(p.x);
    const row = Math.round(p.y);
    if (col < 0 || col >= W || row < 0 || row >= H) continue;
    // Pick glyph brightness tier by remaining life.
    let cell = p.glyph;
    if (theme.colorEnabled) {
      if (p.life > 0.7)      cell = song.accent + p.glyph + song.reset;
      else if (p.life > 0.35) cell = song.bright + p.glyph + song.reset;
      else                     cell = song.dim    + p.glyph + song.reset;
    }
    renderer.write(col, region.y + row, cell);
  }

  // ── Beat flash bar — unchanged concept, now using song accent colour ──────
  if (beatFlash > 0.05 && theme.colorEnabled) {
    const ch = ascii ? "=" : "\u2550";
    const flashStyle = beatFlash > 0.5 ? song.accent : song.bright;
    const flashCell = flashStyle + ch + song.reset;
    for (let col = 0; col < W; col++) {
      const amp = state.scrollHistory[col] ?? 0;
      if (amp < 0.08 || col >= W - 3) {
        renderer.write(col, region.y + cy, flashCell);
      }
    }
    if (beatFlash > 0.35 && !ascii) {
      const echoOffset = Math.max(1, Math.floor(halfH * 0.35));
      const echoCell = song.dim + "\u00B7" + song.reset;
      for (let col = 0; col < W; col += 2) {
        const r1 = region.y + cy - echoOffset;
        const r2 = region.y + cy + echoOffset;
        if (r1 >= region.y) renderer.write(col, r1, echoCell);
        if (r2 < region.y + H) renderer.write(col, r2, echoCell);
      }
    }
  }
}

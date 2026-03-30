# Pitch-to-Palette Design

**Date:** 2026-03-30
**Status:** Approved

## Overview

Use Spotify's per-segment pitch data (already fetched via `/audio-analysis`) to drive a real-time colour palette for all three visualiser modes (wavefield, scroll, spectrum). The dominant pitch class determines a hue; the spread across all 12 pitches determines saturation; per-cell amplitude determines lightness — the same as before, but hue-shifted by the music.

## Architecture

One new module, three touched files:

```
src/visualizer/pitchPalette.ts   ← NEW — all pitch→colour math (pure functions)
src/visualizer/state.ts          ← add pitchHue, targetPitchHue fields
src/visualizer/engine.ts         ← set targetPitchHue from segment; lerp pitchHue each frame
src/visualizer/modes/wavefield.ts
src/visualizer/modes/scroll.ts
src/visualizer/modes/spectrum.ts  ← all three use pitchHue from state instead of fixed theme colour
```

## Data Flow

```
Spotify audio analysis
  └─ segments[i].pitches[0..11]   (12 floats 0.0–1.0, chromatic scale)
        │
        ▼  computePitchHue(pitches) → degrees 0–360
        │
  state.targetPitchHue            updated each segment boundary (~0.2–0.5 s)
        │
        ▼  lerpCircularHue(current, target, 0.08) per frame @ 30fps
        │
  state.pitchHue                  smooth animated value
        │
        ▼  hueToAnsi256(hue, saturation, intensity)
        │
  wavefield / scroll / spectrum renderers
```

## Module: `src/visualizer/pitchPalette.ts`

### `computePitchHue(pitches: number[]): { hue: number; saturation: number } | null`

Returns `null` if all pitch values are zero (caller holds previous hue).

**Circular weighted mean** — correct across the 0°/360° boundary:

```
θᵢ = i × 30°    (C=0°, C#=30°, D=60°, …, B=330°)
sinSum = Σ sin(θᵢ) × pitches[i]
cosSum = Σ cos(θᵢ) × pitches[i]
hue    = atan2(sinSum, cosSum) converted to 0–360°
```

**Saturation** = `max(pitches[i])` — high when one pitch dominates (clear key centre), low when energy is spread across many pitches (dissonance, chromatic passage). Range 0.0–1.0.

### `lerpCircularHue(current: number, target: number, t: number): number`

Interpolates across the shorter arc of the circle to avoid spinning 350° the wrong way when crossing 0°/360°. Returns `(current + delta × t + 360) % 360`.

### `hueToAnsi256(hue: number, saturation: number, intensity: number): number`

Converts HSL → RGB → xterm-256 index.

- `H` = `hue`
- `S` = `saturation` (clamped 0.2–1.0 so colours never go fully grey)
- `L` = `intensity` mapped to 0.15–0.85 (avoids pure black/white extremes)

RGB derived via standard HSL→RGB formula. Then:

```
ri = Math.round((r / 255) × 5)
gi = Math.round((g / 255) × 5)
bi = Math.round((b / 255) × 5)
xterm = 16 + 36×ri + 6×gi + bi
```

## State Changes (`src/visualizer/state.ts`)

```typescript
pitchHue: number        // current animated hue, degrees 0–360, starts at 0
targetPitchHue: number  // hue computed from latest segment, degrees 0–360
pitchSaturation: number // saturation from latest segment, 0.0–1.0, starts at 0.5
```

## Engine Changes (`src/visualizer/engine.ts`)

### `syncAnalysisFrame()` — set targetPitchHue

After advancing `currentSegmentIndex`, call:

```typescript
const pitches = analysis.segments[this.state.currentSegmentIndex]?.pitches;
if (pitches) {
  const result = computePitchHue(pitches);
  if (result !== null) {
    this.state.targetPitchHue = result.hue;
    this.state.pitchSaturation = result.saturation;
  }
  // if null (all zeros), hold previous values
}
```

### `draw()` — lerp hue each frame

Before dispatching to renderers:

```typescript
this.state.pitchHue = lerpCircularHue(
  this.state.pitchHue,
  this.state.targetPitchHue,
  0.08
);
```

The lerp factor 0.08 at 30fps gives a ~0.7 s half-life transition — fast enough to track chord changes, slow enough to avoid flickering.

## Renderer Changes

All three renderer files replace their fixed colour selection with a call to `hueToAnsi256`. The signature each renderer already computes an `intensity` value (0.0–1.0) per cell from amplitude — that value becomes the `L` input.

**Wavefield:** Replace the existing ANSI 256 cell colour with `hueToAnsi256(s.pitchHue, s.pitchSaturation, intensity)`.

**Scroll:** Same — each sample's brightness already maps to intensity; feed through the hue converter.

**Spectrum:** Each bar currently picks a colour by frequency band. Replace that logic with `hueToAnsi256(s.pitchHue, s.pitchSaturation, barHeight / maxHeight)` — all bars share the pitch hue, brightness scales with bar height.

## Fallback & Error Handling

| Condition | Behaviour |
|---|---|
| No `analysis` in state | `targetPitchHue` stays at 0° (renders as red-ish neutral); no crash |
| All-zero pitches in segment | `computePitchHue` returns `null`; engine holds previous target |
| `lerpCircularHue` produces NaN | Clamp result to 0°; this can only occur if both inputs are NaN |
| No active Spotify playback | `pitchHue` stays at last value; resets to 0° when `trackId` clears |

## What the User Sees

- **Key of E major** → wavefield blooms green
- **Chorus shifts to A** → purple bleeds in over ~0.7 s
- **Dissonant chromatic run** → saturation drops, field goes near-white
- **Key change** → feels like a lighting shift on a stage
- **Pitch: ■ E (0.89)** label in header already exists; the coloured square would match field hue

## Out of Scope

- Per-bar frequency-based colouring in spectrum (replaced, not augmented)
- Timbre-to-texture and tatum micro-jitter (separate features)
- User-adjustable lerp speed (hardcoded 0.08; can be added later)
- Background/terminal background colour changes (foreground characters only)

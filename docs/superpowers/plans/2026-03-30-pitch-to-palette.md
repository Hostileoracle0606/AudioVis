# Pitch-to-Palette Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Drive all three visualiser colour palettes from Spotify's per-segment pitch data, producing a smooth hue animation tied to the key/chord of the current track.

**Architecture:** A new pure-function module (`pitchPalette.ts`) handles all math. `VisState` gains three fields. The engine reads pitch data in `syncAnalysisFrame()` and lerps the hue each frame in `draw()`. All three renderers swap their hard-coded `theme.bright/normal/dim` colour calls for dynamic pitch-hue ANSI 256-color strings.

**Tech Stack:** TypeScript, Node.js, ANSI X3.64 256-color escape codes (`\x1b[38;5;Nm`), xterm-256 RGB cube (`16 + 36r + 6g + b`), Spotify Audio Analysis API (already wired).

---

### Task 1: Create `src/visualizer/pitchPalette.ts`

**Files:**
- Create: `src/visualizer/pitchPalette.ts`

- [ ] **Step 1: Write the file**

```typescript
/**
 * Pitch-to-Palette: converts Spotify segment pitch data into ANSI 256 colours.
 * All functions are pure (no side effects, no project imports).
 */

/**
 * Compute a weighted-mean hue (0–360°) from a 12-element Spotify pitch array.
 * Uses circular mean so the 0°/360° boundary is handled correctly.
 * Returns null when all pitches are zero (caller should hold previous hue).
 *
 * Pitch → hue mapping (30° per semitone):
 *   C=0°  C#=30°  D=60°  D#=90°  E=120°  F=150°
 *   F#=180°  G=210°  G#=240°  A=270°  A#=300°  B=330°
 *
 * saturation = max(pitches) — high when one pitch dominates a clear key centre.
 */
export function computePitchHue(
  pitches: number[]
): { hue: number; saturation: number } | null {
  let sinSum = 0;
  let cosSum = 0;
  let total = 0;

  for (let i = 0; i < 12; i++) {
    const w = pitches[i] ?? 0;
    const theta = (i * 30 * Math.PI) / 180; // 0°, 30°, …, 330° in radians
    sinSum += Math.sin(theta) * w;
    cosSum += Math.cos(theta) * w;
    total += w;
  }

  if (total === 0) return null;

  const hueRad = Math.atan2(sinSum, cosSum);
  const hue = ((hueRad * 180) / Math.PI + 360) % 360;
  const saturation = Math.max(...pitches.slice(0, 12));

  return { hue, saturation };
}

/**
 * Interpolate between two hues along the shorter arc of the colour wheel.
 * Avoids spinning 350° the wrong way when crossing 0°/360°.
 * Returns 0 if result is NaN (both inputs NaN — should never occur in practice).
 */
export function lerpCircularHue(
  current: number,
  target: number,
  t: number
): number {
  const delta = ((target - current + 540) % 360) - 180; // −180…+180
  const result = (current + delta * t + 360) % 360;
  return isNaN(result) ? 0 : result;
}

/**
 * Convert HSL (pitch-derived hue + saturation, amplitude-derived intensity)
 * to an xterm-256 palette index.
 *
 * @param hue        0–360 degrees
 * @param saturation 0–1 (clamped 0.2–1.0 so colours never go fully grey)
 * @param intensity  0–1 (mapped to lightness 0.15–0.85, avoiding pure black/white)
 */
export function hueToAnsi256(
  hue: number,
  saturation: number,
  intensity: number
): number {
  const h = ((hue % 360) + 360) % 360;
  const s = Math.max(0.2, Math.min(1.0, saturation));
  const l = 0.15 + Math.max(0, Math.min(1, intensity)) * 0.70; // 0.15–0.85

  // HSL → RGB (standard algorithm)
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r1 = 0, g1 = 0, b1 = 0;
  if      (h < 60)  { r1 = c; g1 = x; b1 = 0; }
  else if (h < 120) { r1 = x; g1 = c; b1 = 0; }
  else if (h < 180) { r1 = 0; g1 = c; b1 = x; }
  else if (h < 240) { r1 = 0; g1 = x; b1 = c; }
  else if (h < 300) { r1 = x; g1 = 0; b1 = c; }
  else              { r1 = c; g1 = 0; b1 = x; }

  const ri = Math.max(0, Math.min(5, Math.round((r1 + m) * 5)));
  const gi = Math.max(0, Math.min(5, Math.round((g1 + m) * 5)));
  const bi = Math.max(0, Math.min(5, Math.round((b1 + m) * 5)));

  return 16 + 36 * ri + 6 * gi + bi;
}

/**
 * Build an ANSI foreground colour escape string from current pitch state.
 * Convenience wrapper used by all three renderer files.
 *
 * @param pitchHue        Current animated hue (0–360°)
 * @param pitchSaturation Current saturation (0–1)
 * @param intensity       Per-cell brightness (0 = dim, 1 = bright)
 */
export function pitchAnsiColor(
  pitchHue: number,
  pitchSaturation: number,
  intensity: number
): string {
  return `\x1b[38;5;${hueToAnsi256(pitchHue, pitchSaturation, intensity)}m`;
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd /Users/trinabgoswamy/Audio-vis && npm run build 2>&1 | head -20
```

Expected: clean build (no errors). The new file has no imports so it cannot introduce circular deps.

- [ ] **Step 3: Smoke-test the math with a quick Node script**

```bash
cd /Users/trinabgoswamy/Audio-vis && node --input-type=module <<'EOF'
import { computePitchHue, lerpCircularHue, hueToAnsi256, pitchAnsiColor } from './dist/visualizer/pitchPalette.js';

// E dominant (index 4) → should be near 120°
const ePitches = [0,0,0,0,0.9,0,0,0,0,0,0,0];
const r1 = computePitchHue(ePitches);
console.assert(r1 !== null, 'computePitchHue should not return null for non-zero pitches');
console.assert(Math.abs(r1.hue - 120) < 5, `E hue should be ~120°, got ${r1?.hue}`);
console.assert(r1.saturation === 0.9, `saturation should be 0.9, got ${r1?.saturation}`);

// All zero → null
const r2 = computePitchHue(new Array(12).fill(0));
console.assert(r2 === null, 'all-zero pitches should return null');

// Circular lerp: 350° → 10° should go via 360° (short arc = 20°), not the long way
const lerped = lerpCircularHue(350, 10, 1.0); // t=1 means arrive at target
console.assert(Math.abs(lerped - 10) < 1, `lerp 350→10 at t=1 should land at 10, got ${lerped}`);

// hueToAnsi256 should return integer in [16, 231]
const idx = hueToAnsi256(120, 0.9, 0.85);
console.assert(idx >= 16 && idx <= 231, `ANSI index out of range: ${idx}`);

// pitchAnsiColor should produce an ANSI escape string
const esc = pitchAnsiColor(120, 0.9, 0.7);
console.assert(esc.startsWith('\x1b[38;5;'), `pitchAnsiColor wrong format: ${esc}`);

console.log('All assertions passed.');
console.log('E major hue:', r1.hue.toFixed(1), '° (expect ~120°)');
console.log('ANSI index for E bright:', idx);
console.log('Escape string sample:', JSON.stringify(esc));
EOF
```

Expected output:
```
All assertions passed.
E major hue: 120.0 ° (expect ~120°)
ANSI index for E bright: <number 16–231>
Escape string sample: "\u001b[38;5;<n>m"
```

- [ ] **Step 4: Commit**

```bash
git add src/visualizer/pitchPalette.ts && git commit -m "feat: add pitchPalette pure-function module (hue math + ANSI 256 helper)"
```

---

### Task 2: Add pitch hue fields to `VisState`

**Files:**
- Modify: `src/visualizer/state.ts`

- [ ] **Step 1: Add three fields to the `VisState` interface**

In `src/visualizer/state.ts`, find the `// Terminal dimensions` comment and add the new fields just above it:

```typescript
  // Pitch-to-palette
  pitchHue: number;        // current animated hue, degrees 0–360
  targetPitchHue: number;  // hue computed from latest analysis segment
  pitchSaturation: number; // saturation derived from segment (max pitch energy)

  // Terminal dimensions
```

- [ ] **Step 2: Initialise the new fields in `createInitialState`**

In `createInitialState`, find `albumArt: null,` and add after it (before the `cols,` line):

```typescript
    pitchHue: 0,
    targetPitchHue: 0,
    pitchSaturation: 0.5,
```

- [ ] **Step 3: Build to verify no type errors**

```bash
cd /Users/trinabgoswamy/Audio-vis && npm run build 2>&1 | head -20
```

Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add src/visualizer/state.ts && git commit -m "feat: add pitchHue/targetPitchHue/pitchSaturation to VisState"
```

---

### Task 3: Wire pitch hue into the engine

**Files:**
- Modify: `src/visualizer/engine.ts`

Three changes: (a) import, (b) set `targetPitchHue` in `syncAnalysisFrame`, (c) lerp `pitchHue` each frame in `draw()`, (d) reset on no-playback.

- [ ] **Step 1: Add imports at the top of `engine.ts`**

Find the existing line:
```typescript
import { renderAlbumArt } from "./modes/albumArt.js";
```

Add immediately after:
```typescript
import { computePitchHue, lerpCircularHue } from "./pitchPalette.js";
```

- [ ] **Step 2: Set `targetPitchHue` at the end of `syncAnalysisFrame()`**

`syncAnalysisFrame()` ends with `this.state.analysisFrame = buildAnalysisFrame(...)` and a closing brace. Find that closing brace and add just before it:

```typescript
    // Update pitch hue target from current segment
    const seg = analysis.segments[this.state.currentSegmentIndex];
    if (seg?.pitches?.length) {
      const pitchResult = computePitchHue(seg.pitches);
      if (pitchResult !== null) {
        this.state.targetPitchHue = pitchResult.hue;
        this.state.pitchSaturation = pitchResult.saturation;
      }
      // if null (all-zero pitches), hold previous values
    }
```

- [ ] **Step 3: Lerp `pitchHue` each frame in `draw()`**

In `draw()`, find the line:
```typescript
    pushScrollHistory(s, layout.visualizer.width);
```

Add immediately before it:
```typescript
    // Smooth pitch hue toward target (lerp factor 0.08 ≈ 0.7 s half-life at 30 fps)
    this.state.pitchHue = lerpCircularHue(
      this.state.pitchHue,
      this.state.targetPitchHue,
      0.08
    );
```

- [ ] **Step 4: Reset pitch hue when Spotify reports no active playback**

In `pollSpotify()`, find the no-playback early return block:
```typescript
        this.state.analysis = null;
        this.state.albumArtUrl = "";
        this.state.albumArt    = null;
        return;
```

Add two lines before `return`:
```typescript
        this.state.targetPitchHue = 0;
        this.state.pitchSaturation = 0.5;
```

- [ ] **Step 5: Build**

```bash
cd /Users/trinabgoswamy/Audio-vis && npm run build 2>&1 | head -20
```

Expected: clean build.

- [ ] **Step 6: Commit**

```bash
git add src/visualizer/engine.ts && git commit -m "feat: wire pitch hue into engine — syncAnalysisFrame + draw lerp + reset"
```

---

### Task 4: Update wavefield renderer

**Files:**
- Modify: `src/visualizer/modes/wavefield.ts`

Two colour sites to update: the braille (plasma) path and the ASCII path.

- [ ] **Step 1: Add import**

At the top of `src/visualizer/modes/wavefield.ts`, find:
```typescript
import type { Region } from "../../ui/layout.js";
```

Add immediately after:
```typescript
import { pitchAnsiColor } from "../pitchPalette.js";
```

- [ ] **Step 2: Replace colour logic in the braille path**

In `renderWavefieldBraille`, find:
```typescript
      if (bits === 0) continue;

      const ch = String.fromCodePoint(0x2800 + bits);
      let cell = ch;

      if (theme.colorEnabled) {
        // Three brightness tiers based on where in [0,1] the peak field value sits.
        // High v = plasma peak (constructive interference) → white-hot.
        // Low v = band edge → dim corona.
        if      (topV > 0.72) cell = theme.bright + ch + theme.reset;
        else if (topV > 0.54) cell = theme.normal + ch + theme.reset;
        else                  cell = theme.dim    + ch + theme.reset;
      }
```

Replace with:
```typescript
      if (bits === 0) continue;

      const ch = String.fromCodePoint(0x2800 + bits);
      let cell = ch;

      if (theme.colorEnabled) {
        // Map plasma field value to intensity tier, then apply pitch hue.
        // topV > 0.72 = plasma peak (constructive interference) → bright.
        // topV < 0.54 = band edge → dim corona.
        const intensity = topV > 0.72 ? 0.85 : topV > 0.54 ? 0.55 : 0.25;
        cell = pitchAnsiColor(state.pitchHue, state.pitchSaturation, intensity) + ch + theme.reset;
      }
```

- [ ] **Step 3: Replace colour logic in the ASCII path**

In the ASCII path at the bottom of `renderWavefield`, find:
```typescript
      const bright = theme.colorEnabled && minDist < 0.5;
      const dim    = theme.colorEnabled && minDist > 1.5;

      let cell = ch;
      if (bright) cell = theme.bright + ch + theme.reset;
      else if (dim) cell = theme.dim  + ch + theme.reset;
      else if (theme.colorEnabled) cell = theme.normal + ch + theme.reset;
```

Replace with:
```typescript
      let cell = ch;
      if (theme.colorEnabled) {
        const intensity = minDist < 0.5 ? 0.85 : minDist > 1.5 ? 0.25 : 0.55;
        cell = pitchAnsiColor(state.pitchHue, state.pitchSaturation, intensity) + ch + theme.reset;
      }
```

- [ ] **Step 4: Build**

```bash
cd /Users/trinabgoswamy/Audio-vis && npm run build 2>&1 | head -20
```

Expected: clean build.

- [ ] **Step 5: Commit**

```bash
git add src/visualizer/modes/wavefield.ts && git commit -m "feat: wavefield renderer uses pitch hue for ANSI 256 colours"
```

---

### Task 5: Update scroll renderer

**Files:**
- Modify: `src/visualizer/modes/scroll.ts`

- [ ] **Step 1: Add import**

At the top of `src/visualizer/modes/scroll.ts`, find:
```typescript
import type { Region } from "../../ui/layout.js";
```

Add immediately after:
```typescript
import { pitchAnsiColor } from "../pitchPalette.js";
```

- [ ] **Step 2: Replace colour logic in `renderScroll`**

Find:
```typescript
      let cell = ch;
      if (theme.colorEnabled) {
        if (frac < 0.25) cell = theme.bright + ch + theme.reset;
        else if (frac > 0.65) cell = theme.dim + ch + theme.reset;
        else cell = theme.normal + ch + theme.reset;
      }
```

Replace with:
```typescript
      let cell = ch;
      if (theme.colorEnabled) {
        const intensity = frac < 0.25 ? 0.85 : frac > 0.65 ? 0.25 : 0.55;
        cell = pitchAnsiColor(state.pitchHue, state.pitchSaturation, intensity) + ch + theme.reset;
      }
```

- [ ] **Step 3: Build**

```bash
cd /Users/trinabgoswamy/Audio-vis && npm run build 2>&1 | head -20
```

Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add src/visualizer/modes/scroll.ts && git commit -m "feat: scroll renderer uses pitch hue for ANSI 256 colours"
```

---

### Task 6: Update spectrum renderer

**Files:**
- Modify: `src/visualizer/modes/spectrum.ts`

Three colour sites: bar cells, partial top row, and the gap baseline.

- [ ] **Step 1: Add import**

At the top of `src/visualizer/modes/spectrum.ts`, find:
```typescript
import type { Region } from "../../ui/layout.js";
```

Add immediately after:
```typescript
import { pitchAnsiColor } from "../pitchPalette.js";
```

- [ ] **Step 2: Replace bar-cell colour logic**

Find:
```typescript
        const bright = theme.colorEnabled && r < 2;
        let cell = ch;
        if (bright) cell = theme.bright + ch + theme.reset;
        else if (theme.colorEnabled) cell = theme.normal + ch + theme.reset;
```

Replace with:
```typescript
        let cell = ch;
        if (theme.colorEnabled) {
          const intensity = r < 2 ? 0.85 : 0.55;
          cell = pitchAnsiColor(state.pitchHue, state.pitchSaturation, intensity) + ch + theme.reset;
        }
```

- [ ] **Step 3: Replace partial-top-row colour**

Find:
```typescript
        const cell = theme.colorEnabled ? theme.dim + ch + theme.reset : ch;
```
(This is inside the `if (partial > 0.3 && fullRows < RH)` block.)

Replace with:
```typescript
        const cell = theme.colorEnabled
          ? pitchAnsiColor(state.pitchHue, state.pitchSaturation, 0.25) + ch + theme.reset
          : ch;
```

- [ ] **Step 4: Replace baseline colour**

Find:
```typescript
      const cell = theme.colorEnabled ? theme.dim + lineChar + theme.reset : lineChar;
```
(This is inside the baseline `for` loop at the bottom of `renderSpectrum`.)

Replace with:
```typescript
      const cell = theme.colorEnabled
        ? pitchAnsiColor(state.pitchHue, state.pitchSaturation, 0.15) + lineChar + theme.reset
        : lineChar;
```

- [ ] **Step 5: Build**

```bash
cd /Users/trinabgoswamy/Audio-vis && npm run build 2>&1 | head -20
```

Expected: clean build.

- [ ] **Step 6: Commit**

```bash
git add src/visualizer/modes/spectrum.ts && git commit -m "feat: spectrum renderer uses pitch hue for ANSI 256 colours"
```

---

### Task 7: End-to-end smoke test

**Files:** none (verification only)

- [ ] **Step 1: Run with `--silent` (no audio device needed)**

```bash
cd /Users/trinabgoswamy/Audio-vis && npm run dev -- visualizer --silent
```

With Spotify playing, you should see:
- **Wavefield:** braille plasma field with a coloured hue matching the track's key (greens for E-heavy tracks, purples for A-heavy, etc.)
- **Scroll:** scrolling bars coloured in the same hue
- **Spectrum:** all bars share the pitch hue, brightness scales with bar height
- **Hue transitions:** smooth 0.7 s crossfade as chords change (not an instant snap)
- **`[s]` to cycle modes:** all three modes show pitch-reactive colour

- [ ] **Step 2: Verify `--no-color` still works**

```bash
npm run dev -- visualizer --silent --no-color
```

Expected: visualiser renders in plain mono (no ANSI codes). The `if (theme.colorEnabled)` guards in all renderers prevent the pitch colour path from running.

- [ ] **Step 3: Verify `--ascii-safe` still works**

```bash
npm run dev -- visualizer --silent --ascii-safe
```

Expected: ASCII characters (`#`, `:`, `.`) render with pitch colours. The ASCII path in wavefield.ts and the unicode/ascii branching in scroll/spectrum still work.

- [ ] **Step 4: Final commit (update plan doc as done)**

```bash
git add docs/superpowers/plans/2026-03-30-pitch-to-palette.md
git commit -m "docs: mark pitch-to-palette plan complete"
```

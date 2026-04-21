# Dense Console Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewire the audio-vis TUI to a dense, dot-matrix console layout: bigger framed album art, 8-pad queue replacing "Recently Played", bitfont big-type active lyric, accent-monopoly reactivity, peak-hold meters, Braille-waveform progress.

**Architecture:** Keep the existing widget/layout/renderer seams intact. Add new pure-function modules (`trackDna`, `peakHold`, `accentArbiter`) feeding rewritten widgets. All reactivity is data-pull from `AppState` at render time — no timers, no push channels. New modules and widget rewrites live under `src/player/` next to their peers.

**Tech Stack:** Node.js ≥18, TypeScript, `node:test` + `node:assert`, frame-buffer renderer in [src/ui/renderer.ts](../../../src/ui/renderer.ts), Ratatui-style layout in [src/ui/tui.ts](../../../src/ui/tui.ts), Braille / half-block / box-drawing unicode.

**Spec:** [docs/superpowers/specs/2026-04-20-dense-console-design.md](../specs/2026-04-20-dense-console-design.md)

**Test command (all):** `npm test` (runs `tsc` then `node --test dist/**/*.test.js`)
**Test command (single file, faster iteration):** `npx tsx --test src/path/to/file.test.ts`

---

## File Structure

**New files:**
- `src/player/trackDna.ts` + `trackDna.test.ts` — deterministic hash-based DNA (bpm/key/energy/...)
- `src/player/peakHold.ts` + `peakHold.test.ts` — peak-hold ring buffer utility
- `src/player/accentArbiter.ts` + `accentArbiter.test.ts` — one-accent-per-panel resolver
- `src/player/widgets/bigLyric.ts` + `bigLyric.test.ts` — bitfont half-block active-lyric renderer
- `src/player/widgets/queuePads.ts` + `queuePads.test.ts` — 8-pad queue grid

**Modified files:**
- `src/player/state.ts` — new fields (`lastTransientAt`, `progressEnvelope`, etc.)
- `src/player/theme.ts` — `accentBright` field
- `src/player/layout.ts` — new regions (`topRow.height=15`, `nowR.width=34`, `padsR.width=34`)
- `src/ui/bitfont.ts` — add `compressToHalfBlock()` utility
- `src/album/converter.ts` — add 4×4 binary fingerprint to `AsciiArt`
- `src/player/widgets/albumArt.ts` — framed screen + footer strip + scanline pulse
- `src/player/widgets/nowPlaying.ts` — title/DNA/meters/transport sub-sections
- `src/player/widgets/lyrics.ts` — delegate active line to `bigLyric`
- `src/player/widgets/spectrum.ts` — Hz labels + peak-hold + bass accent + footer
- `src/player/widgets/controls.ts` — Braille-waveform progress + LED chaser strip
- `src/player/widgets/titleBar.ts` — 2-row with status LEDs
- `src/player/App.ts` — wire arbiter, swap widgets, pad keybinds
- `src/ui/input.ts` — register `play_pad_N` hotkeys

**Deleted files:**
- `src/player/widgets/recentlyPlayed.ts` + `recentlyPlayed.test.ts`

---

## Task 0: Baseline check

**Files:** none

- [ ] **Step 1: Confirm clean baseline**

Run: `npm test`
Expected: builds, most tests pass. Some pre-existing failures (≤7) are acceptable; record the count so we can tell *new* failures from pre-existing ones.

- [ ] **Step 2: Record baseline**

Run: `npm test 2>&1 | tail -5`
Capture the `# pass N` / `# fail N` lines — use these as the "before" numbers for the rest of the plan.

---

## Task 1: Extend AppState with reactivity fields

**Files:**
- Modify: `src/player/state.ts`
- Test: `src/player/state.test.ts` (existing)

- [ ] **Step 1: Add failing test for new state fields**

Append to `src/player/state.test.ts`:

```ts
test("createInitialState includes new reactivity fields", () => {
  const s = createInitialState(100, 30);
  assert.strictEqual(s.lastTransientAt, 0);
  assert.strictEqual(s.lastClipAt, 0);
  assert.strictEqual(s.lastPeakAt, 0);
  assert.strictEqual(s.progressEnvelope.length, 128);
  assert.strictEqual(s.ledChaserIndex, 0);
  assert.strictEqual(s.activePadIndex, 0);
  assert.ok(Array.isArray(s.padFingerprints));
  assert.strictEqual(s.padFingerprints.length, 8);
});
```

- [ ] **Step 2: Run test — expect fail**

Run: `npx tsx --test src/player/state.test.ts`
Expected: FAIL — properties don't exist.

- [ ] **Step 3: Extend the AppState interface and initializer**

In `src/player/state.ts`, add to the `AppState` interface (after `savedVolume`):

```ts
  lastTransientAt: number;
  lastClipAt: number;
  lastPeakAt: number;
  progressEnvelope: Float32Array;
  ledChaserIndex: number;
  activePadIndex: number;
  padFingerprints: Uint8Array[];
```

In `createInitialState(...)`, add these to the returned object (before `quit: false`):

```ts
    lastTransientAt: 0, lastClipAt: 0, lastPeakAt: 0,
    progressEnvelope: new Float32Array(128),
    ledChaserIndex: 0,
    activePadIndex: 0,
    padFingerprints: Array.from({ length: 8 }, () => new Uint8Array(16)),
```

- [ ] **Step 4: Run test — expect pass**

Run: `npx tsx --test src/player/state.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/player/state.ts src/player/state.test.ts
git commit -m "state: add reactivity fields (transient/clip/peak timestamps, envelope, pads)"
```

---

## Task 2: Extend theme with accentBright

**Files:**
- Modify: `src/player/theme.ts`
- Test: `src/player/theme.test.ts` (new)

- [ ] **Step 1: Write failing test**

Create `src/player/theme.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert";
import { buildTheme, PALETTE_COUNT } from "./theme.js";

test("theme exposes accentBright distinct from accent", () => {
  const t = buildTheme(0, false);
  assert.ok(t.accentBright.length > 0);
  assert.notStrictEqual(t.accentBright, t.accent);
});

test("noColor theme has empty accentBright", () => {
  const t = buildTheme(0, true);
  assert.strictEqual(t.accentBright, "");
});

test("all palettes produce a valid accentBright", () => {
  for (let i = 0; i < PALETTE_COUNT; i++) {
    const t = buildTheme(i, false);
    assert.ok(t.accentBright.length > 0, `palette ${i} missing accentBright`);
  }
});
```

- [ ] **Step 2: Run test — expect fail**

Run: `npx tsx --test src/player/theme.test.ts`
Expected: FAIL — `accentBright` property does not exist.

- [ ] **Step 3: Add accentBright to theme**

In `src/player/theme.ts`, extend the `Theme` interface:

```ts
export interface Theme {
  fg: string;
  dim: string;
  border: string;
  accent: string;
  accentBright: string;
  spectrum: string[];
  meter: string;
  reset: string;
}
```

Define a parallel bright palette and use it in `buildTheme`:

```ts
const PALETTE_WARM_BRIGHT    = 220; // bumped from 208
const PALETTE_TEAL_BRIGHT    = 81;
const PALETTE_MAGENTA_BRIGHT = 201;
const PALETTE_MONO_BRIGHT    = 255;

const BRIGHT_ACCENTS = [PALETTE_WARM_BRIGHT, PALETTE_TEAL_BRIGHT, PALETTE_MAGENTA_BRIGHT, PALETTE_MONO_BRIGHT];
```

In `buildTheme`, update the no-color branch:

```ts
  if (noColor) {
    return {
      fg: "", dim: "", border: "", accent: "", accentBright: "", meter: "", reset: "",
      spectrum: new Array(16).fill(""),
    };
  }
```

And the color branch — add after `accent`:

```ts
    accentBright: FG256(BRIGHT_ACCENTS[paletteIndex % PALETTES.length]),
```

- [ ] **Step 4: Run tests — expect pass**

Run: `npx tsx --test src/player/theme.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/player/theme.ts src/player/theme.test.ts
git commit -m "theme: add accentBright for lyric transient flash"
```

---

## Task 3: trackDna — deterministic hash-based DNA

**Files:**
- Create: `src/player/trackDna.ts`
- Test: `src/player/trackDna.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/player/trackDna.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert";
import { computeDna, KEY_NAMES } from "./trackDna.js";

test("computeDna is deterministic", () => {
  const a = computeDna("killer on the loose|rex vijayan");
  const b = computeDna("killer on the loose|rex vijayan");
  assert.deepStrictEqual(a, b);
});

test("computeDna varies across track IDs", () => {
  const ids = Array.from({ length: 100 }, (_, i) => `track-${i}|artist`);
  const bpms = new Set(ids.map((id) => computeDna(id).bpm));
  assert.ok(bpms.size >= 40, `expected ≥40 unique bpms across 100 tracks, got ${bpms.size}`);
});

test("computeDna bpm is within 72-168", () => {
  for (let i = 0; i < 1000; i++) {
    const d = computeDna(`t${i}|a`);
    assert.ok(d.bpm >= 72 && d.bpm <= 168, `bpm ${d.bpm} out of range`);
  }
});

test("computeDna 0-100 gauges in range", () => {
  for (let i = 0; i < 1000; i++) {
    const d = computeDna(`t${i}|a`);
    for (const k of ["energy","valence","danceability","acousticness"] as const) {
      assert.ok(d[k] >= 0 && d[k] <= 100, `${k} ${d[k]} out of range`);
    }
  }
});

test("computeDna lufs is within -19 to -4", () => {
  for (let i = 0; i < 1000; i++) {
    const d = computeDna(`t${i}|a`);
    assert.ok(d.lufs >= -19 && d.lufs <= -4, `lufs ${d.lufs} out of range`);
  }
});

test("computeDna key is in KEY_NAMES", () => {
  const d = computeDna("x|y");
  assert.ok(KEY_NAMES.includes(d.key));
  assert.ok(["maj","min"].includes(d.keyMode));
});
```

- [ ] **Step 2: Run — expect fail**

Run: `npx tsx --test src/player/trackDna.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement computeDna**

Create `src/player/trackDna.ts`:

```ts
export const KEY_NAMES = ["c","c#","d","d#","e","f","f#","g","g#","a","a#","b"] as const;
export type KeyName = typeof KEY_NAMES[number];

export interface TrackDna {
  bpm: number;
  key: KeyName;
  keyMode: "maj" | "min";
  lufs: number;
  energy: number;
  valence: number;
  danceability: number;
  acousticness: number;
}

function djb2(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return h >>> 0;
}

function splitmix32(seed: number): () => number {
  let z = seed >>> 0;
  return () => {
    z = (z + 0x9e3779b9) >>> 0;
    let t = z;
    t = Math.imul(t ^ (t >>> 16), 0x21f0aaad) >>> 0;
    t = Math.imul(t ^ (t >>> 15), 0x735a2d97) >>> 0;
    return (t ^ (t >>> 15)) >>> 0;
  };
}

/** Pure function: same input → same TrackDna. */
export function computeDna(id: string): TrackDna {
  const seed = djb2(id);
  const next = splitmix32(seed);
  const bpm = 72 + (next() % 97);                     // 72..168
  const keyIdx = next() % 12;
  const keyMode: "maj" | "min" = (next() & 1) ? "maj" : "min";
  const lufs = -4 - (next() % 16);                    // -4..-19
  const energy = next() % 101;
  const valence = next() % 101;
  const danceability = next() % 101;
  const acousticness = next() % 101;
  return {
    bpm, key: KEY_NAMES[keyIdx], keyMode, lufs,
    energy, valence, danceability, acousticness,
  };
}

/** Stable short catalog number for a track, zero-padded to 3 chars. */
export function catalogNumber(id: string): string {
  return String(djb2(id) % 1000).padStart(3, "0");
}
```

- [ ] **Step 4: Run — expect pass**

Run: `npx tsx --test src/player/trackDna.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/player/trackDna.ts src/player/trackDna.test.ts
git commit -m "trackDna: deterministic hash-based bpm/key/energy/... per trackId"
```

---

## Task 4: peakHold utility

**Files:**
- Create: `src/player/peakHold.ts`
- Test: `src/player/peakHold.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/player/peakHold.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert";
import { createPeakHold, updatePeakHold } from "./peakHold.js";

test("new max updates value and extends hold", () => {
  const buf = createPeakHold(3);
  updatePeakHold(buf, new Float32Array([0.5, 0.2, 0.9]), 1000, 500);
  assert.deepStrictEqual(Array.from(buf.values), [0.5, 0.2, 0.9]);
  assert.deepStrictEqual(Array.from(buf.heldUntilMs), [1500, 1500, 1500]);
});

test("lower current does not overwrite during hold", () => {
  const buf = createPeakHold(2);
  updatePeakHold(buf, new Float32Array([0.8, 0.3]), 1000, 500);
  updatePeakHold(buf, new Float32Array([0.1, 0.2]), 1200, 500);
  assert.strictEqual(buf.values[0], 0.8);
  assert.strictEqual(buf.values[1], 0.3);
});

test("after hold expires, value decays toward 0", () => {
  const buf = createPeakHold(1);
  updatePeakHold(buf, new Float32Array([1.0]), 1000, 500);
  // After hold, decay at 0.0002 per ms → 100ms = -0.02
  updatePeakHold(buf, new Float32Array([0.0]), 1600, 500);
  assert.ok(buf.values[0] < 1.0, "value should decay after hold expires");
  assert.ok(buf.values[0] >= 0, "value should not go negative");
});

test("value clamps at 0 and does not go negative", () => {
  const buf = createPeakHold(1);
  updatePeakHold(buf, new Float32Array([0.01]), 1000, 100);
  updatePeakHold(buf, new Float32Array([0]), 5000, 100);
  assert.strictEqual(buf.values[0], 0);
});
```

- [ ] **Step 2: Run — expect fail**

Run: `npx tsx --test src/player/peakHold.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/player/peakHold.ts`:

```ts
export interface PeakHoldBuffer {
  values: Float32Array;
  heldUntilMs: Float64Array;
  lastUpdateMs: number;
}

/** Decay rate: 0.02 per 100ms = 0.0002 per ms → value reaches 0 from 1.0 in ~5s */
const DECAY_PER_MS = 0.0002;

export function createPeakHold(size: number): PeakHoldBuffer {
  return {
    values: new Float32Array(size),
    heldUntilMs: new Float64Array(size),
    lastUpdateMs: 0,
  };
}

export function updatePeakHold(
  buf: PeakHoldBuffer,
  current: Float32Array,
  now: number,
  holdMs: number,
): void {
  const dt = buf.lastUpdateMs === 0 ? 0 : Math.max(0, now - buf.lastUpdateMs);
  for (let i = 0; i < buf.values.length; i++) {
    const cur = current[i] ?? 0;
    if (cur >= buf.values[i]) {
      buf.values[i] = cur;
      buf.heldUntilMs[i] = now + holdMs;
    } else if (now > buf.heldUntilMs[i]) {
      buf.values[i] = Math.max(0, buf.values[i] - DECAY_PER_MS * dt);
    }
  }
  buf.lastUpdateMs = now;
}
```

- [ ] **Step 4: Run — expect pass**

Run: `npx tsx --test src/player/peakHold.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/player/peakHold.ts src/player/peakHold.test.ts
git commit -m "peakHold: add ring buffer with hold-then-decay"
```

---

## Task 5: accentArbiter

**Files:**
- Create: `src/player/accentArbiter.ts`
- Test: `src/player/accentArbiter.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/player/accentArbiter.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert";
import { resolveAccentTargets } from "./accentArbiter.js";
import { createInitialState } from "./state.js";

test("default includes lyric", () => {
  const s = createInitialState(100, 30);
  const set = resolveAccentTargets(s, 10000);
  assert.ok(set.has("lyric"));
});

test("transient within 100ms adds sync", () => {
  const s = createInitialState(100, 30);
  s.lastTransientAt = 9950;
  const set = resolveAccentTargets(s, 10000);
  assert.ok(set.has("sync"));
});

test("transient with high energy within 100ms adds bass-bin", () => {
  const s = createInitialState(100, 30);
  s.lastTransientAt = 9950;
  s.transientEnergy = 0.8;
  const set = resolveAccentTargets(s, 10000);
  assert.ok(set.has("bass-bin"));
});

test("transient with low energy does NOT add bass-bin", () => {
  const s = createInitialState(100, 30);
  s.lastTransientAt = 9950;
  s.transientEnergy = 0.3;
  const set = resolveAccentTargets(s, 10000);
  assert.ok(!set.has("bass-bin"));
});

test("clip within 200ms adds clip", () => {
  const s = createInitialState(100, 30);
  s.lastClipAt = 9850;
  const set = resolveAccentTargets(s, 10000);
  assert.ok(set.has("clip"));
});

test("peak within 200ms adds peak", () => {
  const s = createInitialState(100, 30);
  s.lastPeakAt = 9850;
  const set = resolveAccentTargets(s, 10000);
  assert.ok(set.has("peak"));
});

test("expired events do not add targets", () => {
  const s = createInitialState(100, 30);
  s.lastTransientAt = 9800; // 200ms ago > 100ms window
  s.lastClipAt = 9700;      // 300ms ago > 200ms window
  s.lastPeakAt = 9700;
  const set = resolveAccentTargets(s, 10000);
  assert.ok(!set.has("sync"));
  assert.ok(!set.has("clip"));
  assert.ok(!set.has("peak"));
});

test("all can coexist", () => {
  const s = createInitialState(100, 30);
  s.lastTransientAt = 9950;
  s.transientEnergy = 0.9;
  s.lastClipAt = 9850;
  s.lastPeakAt = 9850;
  const set = resolveAccentTargets(s, 10000);
  assert.ok(set.has("lyric"));
  assert.ok(set.has("sync"));
  assert.ok(set.has("bass-bin"));
  assert.ok(set.has("clip"));
  assert.ok(set.has("peak"));
});
```

- [ ] **Step 2: Run — expect fail**

Run: `npx tsx --test src/player/accentArbiter.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/player/accentArbiter.ts`:

```ts
import type { AppState } from "./state.js";

export type AccentTarget = "lyric" | "sync" | "bass-bin" | "peak" | "clip" | "lim";

const SYNC_WINDOW_MS = 100;
const BASS_WINDOW_MS = 100;
const LEVEL_WINDOW_MS = 200;
const BASS_ENERGY_THRESHOLD = 0.6;
const LIM_RMS_THRESHOLD = 0.7;

/**
 * Returns the set of accent targets active this frame.
 * Panels are scoped: the lyrics panel always holds "lyric", while the
 * spectrum can separately hold "bass-bin" during onsets, etc. Callers
 * check membership for their own element.
 */
export function resolveAccentTargets(state: AppState, nowMs: number): Set<AccentTarget> {
  const out = new Set<AccentTarget>();
  out.add("lyric");
  if (nowMs - state.lastTransientAt <= SYNC_WINDOW_MS) out.add("sync");
  if (nowMs - state.lastTransientAt <= BASS_WINDOW_MS && state.transientEnergy > BASS_ENERGY_THRESHOLD) {
    out.add("bass-bin");
  }
  if (nowMs - state.lastClipAt <= LEVEL_WINDOW_MS) out.add("clip");
  if (nowMs - state.lastPeakAt <= LEVEL_WINDOW_MS) out.add("peak");
  if (state.rms > LIM_RMS_THRESHOLD) out.add("lim");
  return out;
}
```

- [ ] **Step 4: Run — expect pass**

Run: `npx tsx --test src/player/accentArbiter.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/player/accentArbiter.ts src/player/accentArbiter.test.ts
git commit -m "accentArbiter: scope accent targets per panel per frame"
```

---

## Task 6: Rewrite layout geometry

**Files:**
- Modify: `src/player/layout.ts`
- Test: `src/player/layout.test.ts` (existing — rewrite)

- [ ] **Step 1: Replace layout tests**

Overwrite `src/player/layout.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert";
import { computeAppLayout, MIN_COLS, MIN_ROWS } from "./layout.js";

test("MIN_COLS=108 and MIN_ROWS=28", () => {
  assert.strictEqual(MIN_COLS, 108);
  assert.strictEqual(MIN_ROWS, 28);
});

test("top row is 15 rows tall and columns sum to inner width", () => {
  const L = computeAppLayout(120, 36);
  assert.strictEqual(L.topRow.height, 15);
  assert.strictEqual(L.nowR.width, 34);
  assert.strictEqual(L.padsR.width, 34);
  assert.strictEqual(L.screenR.width + L.nowR.width + L.padsR.width, L.inner.width);
});

test("middle row has minimum 8 rows", () => {
  const L = computeAppLayout(120, 36);
  assert.ok(L.middleRow.height >= 8, `middleRow height ${L.middleRow.height} < 8`);
});

test("middle halves split 55/45 in favor of lyrics", () => {
  const L = computeAppLayout(120, 36);
  assert.ok(L.lyricsR.width > L.spectrumR.width);
  assert.strictEqual(L.lyricsR.width + L.spectrumR.width, L.inner.width);
});

test("no cross junctions (up and down arrays disjoint)", () => {
  const L = computeAppLayout(120, 36);
  for (const x of L.sep2Up) assert.ok(!L.sep2Down.includes(x), `cross at x=${x} on sep2`);
});

test("reports tooSmall below minimums", () => {
  const L = computeAppLayout(MIN_COLS - 1, MIN_ROWS);
  assert.strictEqual(L.tooSmall, true);
});
```

- [ ] **Step 2: Run — expect fail**

Run: `npx tsx --test src/player/layout.test.ts`
Expected: FAIL — `L.screenR` / `L.padsR` / new MIN_COLS etc. not present.

- [ ] **Step 3: Rewrite layout**

Overwrite `src/player/layout.ts`:

```ts
import { hSplit, vSplit, C } from "../ui/tui.js";
import type { Region } from "../ui/tui.js";

export const MIN_COLS = 108;
export const MIN_ROWS = 28;
const TOP_ROW_H = 15;
const BOTTOM_ROW_H = 2;
const NOW_W = 34;
const PADS_W = 34;

export interface AppLayout {
  outer: Region;
  inner: Region;
  titleBar: Region;
  brandR: Region;
  searchR: Region;
  sysLoadR: Region;
  sep1Y: number;
  sep1Down: number[];
  topRow: Region;
  screenR: Region;
  nowR: Region;
  padsR: Region;
  sep2Y: number;
  sep2Up: number[];
  sep2Down: number[];
  middleRow: Region;
  lyricsR: Region;
  spectrumR: Region;
  sep3Y: number;
  sep3Up: number[];
  bottomRow: Region;
  scrubR: Region;
  keysR: Region;
  tooSmall: boolean;
}

export function computeAppLayout(cols: number, rows: number): AppLayout {
  const outer: Region = { x: 0, y: 0, width: cols, height: rows };
  const inner: Region = {
    x: 1, y: 1,
    width: Math.max(0, cols - 2),
    height: Math.max(0, rows - 2),
  };
  const tooSmall = cols < MIN_COLS || rows < MIN_ROWS;

  const [titleBar, sep1R, topRow, sep2R, middleRow, sep3R, bottomRow] = vSplit(inner, [
    C.length(1), C.length(1), C.length(TOP_ROW_H), C.length(1), C.fill(), C.length(1), C.length(BOTTOM_ROW_H),
  ]);

  const [brandR, searchR, sysLoadR] = hSplit(titleBar, [
    C.length(50), C.fill(), C.length(44),
  ]);

  const [screenR, nowR, padsR] = hSplit(topRow, [
    C.fill(), C.length(NOW_W), C.length(PADS_W),
  ]);

  const [lyricsR, spectrumR] = hSplit(middleRow, [
    C.percent(55), C.percent(45),
  ]);

  const [scrubR, keysR] = vSplit(bottomRow, [C.length(1), C.length(1)]);

  const colBreakA = screenR.x + screenR.width;
  const colBreakB = nowR.x + nowR.width;
  const midBreak  = lyricsR.x + lyricsR.width;

  return {
    outer, inner,
    titleBar, brandR, searchR, sysLoadR,
    sep1Y: sep1R.y,
    sep1Down: [colBreakA, colBreakB],
    topRow, screenR, nowR, padsR,
    sep2Y: sep2R.y,
    sep2Up: [colBreakA, colBreakB],
    sep2Down: [midBreak],
    middleRow, lyricsR, spectrumR,
    sep3Y: sep3R.y,
    sep3Up: [midBreak],
    bottomRow, scrubR, keysR,
    tooSmall,
  };
}
```

- [ ] **Step 4: Run — expect pass**

Run: `npx tsx --test src/player/layout.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/player/layout.ts src/player/layout.test.ts
git commit -m "layout: widen min size, 3-col top row (screen fill + now 34 + pads 34), 55/45 middle"
```

---

## Task 7: Add half-block compression to bitfont

**Files:**
- Modify: `src/ui/bitfont.ts`
- Test: `src/ui/bitfont.test.ts` (existing — append)

- [ ] **Step 1: Append failing tests**

Append to `src/ui/bitfont.test.ts`:

```ts
import { renderBigLine, compressToHalfBlock } from "./bitfont.js";

test("compressToHalfBlock halves row count", () => {
  const lines = renderBigLine("HI");
  assert.strictEqual(lines.length, 8);
  const compressed = compressToHalfBlock(lines);
  assert.strictEqual(compressed.length, 4);
});

test("compressToHalfBlock uses ▀▄█ and space only", () => {
  const compressed = compressToHalfBlock(renderBigLine("ABC"));
  for (const line of compressed) {
    for (const ch of line) {
      assert.ok(
        ch === "\u2580" || ch === "\u2584" || ch === "\u2588" || ch === " ",
        `unexpected char ${JSON.stringify(ch)} in compressed output`,
      );
    }
  }
});

test("compressToHalfBlock preserves width", () => {
  const wide = renderBigLine("HELLO");
  const compressed = compressToHalfBlock(wide);
  assert.strictEqual(compressed[0].length, wide[0].length);
});

test("compressToHalfBlock: top-only = ▀, bottom-only = ▄, both = █, neither = space", () => {
  // Handcrafted 2-row input: "█  █" over "   █"
  const input = ["\u2588  \u2588", "   \u2588"];
  const out = compressToHalfBlock(input);
  assert.strictEqual(out.length, 1);
  // col 0: top █, bottom space → ▀
  // col 1: both space → space
  // col 2: both space → space
  // col 3: top █, bottom █ → █
  assert.strictEqual(out[0], "\u2580  \u2588");
});
```

- [ ] **Step 2: Run — expect fail**

Run: `npx tsx --test src/ui/bitfont.test.ts`
Expected: FAIL — `compressToHalfBlock` not exported.

- [ ] **Step 3: Implement**

Append to `src/ui/bitfont.ts`:

```ts
/**
 * Pack every 2 rows of input into 1 row of output using half-block glyphs.
 * Treats any non-space character as "on". Output uses only:
 *   ▀ (top half)   ▄ (bottom half)   █ (both)   space (neither)
 * If input has an odd number of rows, the last row is treated as a top
 * half with an empty bottom.
 */
export function compressToHalfBlock(rows: string[]): string[] {
  const out: string[] = [];
  const width = rows.length > 0 ? rows[0].length : 0;
  for (let r = 0; r < rows.length; r += 2) {
    const top = rows[r] ?? "";
    const bot = rows[r + 1] ?? "";
    let line = "";
    for (let c = 0; c < width; c++) {
      const t = (top[c] ?? " ") !== " ";
      const b = (bot[c] ?? " ") !== " ";
      line += t && b ? "\u2588" : t ? "\u2580" : b ? "\u2584" : " ";
    }
    out.push(line);
  }
  return out;
}
```

- [ ] **Step 4: Run — expect pass**

Run: `npx tsx --test src/ui/bitfont.test.ts`
Expected: PASS (existing + 4 new).

- [ ] **Step 5: Commit**

```bash
git add src/ui/bitfont.ts src/ui/bitfont.test.ts
git commit -m "bitfont: compressToHalfBlock packs 8 pixel rows into 4 terminal rows"
```

---

## Task 8: bigLyric widget

**Files:**
- Create: `src/player/widgets/bigLyric.ts`
- Test: `src/player/widgets/bigLyric.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/player/widgets/bigLyric.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert";
import { Renderer } from "../../ui/renderer.js";
import { renderBigLyric } from "./bigLyric.js";
import { buildTheme } from "../theme.js";

test("renderBigLyric writes 4 half-block rows at region.y + 1", () => {
  const r = new Renderer(80, 10);
  renderBigLyric(r, { x: 0, y: 1, width: 80, height: 6 }, { text: "HI", bright: false }, buildTheme(0, true));
  const lines = r.debugLines();
  // Rows 2..5 should have content; count non-space cells per row
  for (let y = 2; y <= 5; y++) {
    const content = lines[y].trim();
    assert.ok(content.length > 0, `row ${y} should have glyph content`);
  }
});

test("renderBigLyric uses accent color by default, accentBright when bright", () => {
  const theme = buildTheme(0, false);
  const r1 = new Renderer(80, 10);
  renderBigLyric(r1, { x: 0, y: 0, width: 80, height: 6 }, { text: "A", bright: false }, theme);
  const r2 = new Renderer(80, 10);
  renderBigLyric(r2, { x: 0, y: 0, width: 80, height: 6 }, { text: "A", bright: true }, theme);
  // Raw cells include SGR — find any row with the accent vs accentBright escape
  const raw1 = (r1 as any).cells.join("");
  const raw2 = (r2 as any).cells.join("");
  assert.ok(raw1.includes(theme.accent), "expected accent SGR in default render");
  assert.ok(raw2.includes(theme.accentBright), "expected accentBright SGR in bright render");
});

test("renderBigLyric writes a leading ● marker at region.x", () => {
  const r = new Renderer(80, 10);
  renderBigLyric(r, { x: 2, y: 0, width: 78, height: 6 }, { text: "X", bright: false }, buildTheme(0, true));
  const lines = r.debugLines();
  // Marker on the middle visible row (y+2, which maps to half-block row index 1)
  assert.ok(lines[2].includes("\u25CF"), "expected ● marker on mid row");
});

test("renderBigLyric clips to region width (no overflow into neighbor cells)", () => {
  const r = new Renderer(20, 10);
  // Small region — "HELLO" is wider than 20 chars after compression
  renderBigLyric(r, { x: 0, y: 0, width: 20, height: 6 }, { text: "HELLO", bright: false }, buildTheme(0, true));
  const lines = r.debugLines();
  for (const line of lines) {
    assert.ok(line.length === 20, `line length ${line.length} !== 20`);
  }
});
```

- [ ] **Step 2: Run — expect fail**

Run: `npx tsx --test src/player/widgets/bigLyric.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/player/widgets/bigLyric.ts`:

```ts
import type { Renderer } from "../../ui/renderer.js";
import type { Region } from "../../ui/tui.js";
import type { Theme } from "../theme.js";
import { renderBigLine, compressToHalfBlock } from "../../ui/bitfont.js";

export interface BigLyricProps {
  text: string;
  bright: boolean;
}

/**
 * Render the active lyric in half-block-compressed bitfont.
 * Occupies rows region.y+1 … region.y+4 (4 rows).
 * Region row 0 is reserved for the panel's context (caller draws).
 * Clips text to region.width; long lyrics are truncated with ellipsis.
 * Leading ● marker is drawn at region.x on the middle compressed row.
 */
export function renderBigLyric(
  r: Renderer,
  region: Region,
  props: BigLyricProps,
  theme: Theme,
): void {
  if (region.width < 8 || region.height < 4) return;

  const color = props.bright ? theme.accentBright : theme.accent;
  const markerCol = region.x + 1;
  const textStartCol = region.x + 3;
  const textMaxWidth = Math.max(0, region.width - 4);

  const pixelRows = renderBigLine(props.text);
  const compressed = compressToHalfBlock(pixelRows);

  const rows = Math.min(compressed.length, region.height - 1);
  for (let i = 0; i < rows; i++) {
    let line = compressed[i];
    if (line.length > textMaxWidth) line = line.slice(0, textMaxWidth);
    r.write(textStartCol, region.y + 1 + i, `${color}${line}${theme.reset}`);
  }

  const midRow = region.y + 1 + Math.floor(rows / 2);
  r.write(markerCol, midRow, `${color}\u25CF${theme.reset}`);
}
```

- [ ] **Step 4: Run — expect pass**

Run: `npx tsx --test src/player/widgets/bigLyric.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/player/widgets/bigLyric.ts src/player/widgets/bigLyric.test.ts
git commit -m "bigLyric: render active lyric as half-block bitfont with ● marker"
```

---

## Task 9: Add padFingerprint to album converter

**Files:**
- Modify: `src/album/converter.ts`
- Test: `src/album/converter.test.ts` (new — small focused test)

- [ ] **Step 1: Write failing test**

Create `src/album/converter.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert";
import { convertToAscii } from "./converter.js";
import Jimp from "jimp";

test("convertToAscii produces a 16-byte padFingerprint", async () => {
  const img = await Jimp.create(8, 8, 0xFF8800FF);
  const buf = await img.getBufferAsync(Jimp.MIME_PNG);
  const art = await convertToAscii(buf, "t1", 20, 6, false);
  assert.ok(art.padFingerprint instanceof Uint8Array);
  assert.strictEqual(art.padFingerprint.length, 16);
});

test("padFingerprint bits are 0 or 1", async () => {
  const img = await Jimp.create(8, 8, 0xFF8800FF);
  const buf = await img.getBufferAsync(Jimp.MIME_PNG);
  const art = await convertToAscii(buf, "t1", 20, 6, false);
  for (const bit of art.padFingerprint) {
    assert.ok(bit === 0 || bit === 1, `bit ${bit} is not 0/1`);
  }
});

test("padFingerprint is deterministic for same input", async () => {
  const img = await Jimp.create(8, 8, 0x808080FF);
  const buf = await img.getBufferAsync(Jimp.MIME_PNG);
  const a = await convertToAscii(buf, "x", 20, 6, false);
  const b = await convertToAscii(buf, "x", 20, 6, false);
  assert.deepStrictEqual(Array.from(a.padFingerprint), Array.from(b.padFingerprint));
});
```

- [ ] **Step 2: Run — expect fail**

Run: `npx tsx --test src/album/converter.test.ts`
Expected: FAIL — `padFingerprint` property does not exist.

- [ ] **Step 3: Add padFingerprint to AsciiArt**

In `src/album/converter.ts`, extend the `AsciiArt` interface:

```ts
export interface AsciiArt {
  trackId: string;
  thumbnail: string[];
  lines: string[];
  fullCols: number;
  fullRows: number;
  playerLines: string[];
  playerCols: number;
  playerRows: number;
  cols: number;
  rows: number;
  padFingerprint: Uint8Array;
}
```

Add the fingerprint generator above `convertToAscii`:

```ts
function computePadFingerprint(img: Jimp): Uint8Array {
  const small = img.clone().resize(4, 4);
  const out = new Uint8Array(16);
  let totalLuma = 0;
  const luma: number[] = [];
  small.scan(0, 0, 4, 4, function(this: Jimp, _x: number, _y: number, idx: number) {
    const rr = this.bitmap.data[idx];
    const gg = this.bitmap.data[idx + 1];
    const bb = this.bitmap.data[idx + 2];
    const y = 0.299 * rr + 0.587 * gg + 0.114 * bb;
    luma.push(y);
    totalLuma += y;
  });
  const mean = totalLuma / 16;
  for (let i = 0; i < 16; i++) out[i] = luma[i] >= mean ? 1 : 0;
  return out;
}
```

In `convertToAscii`, add before `return`:

```ts
  const padFingerprint = computePadFingerprint(img);
```

Extend the returned object:

```ts
  return {
    trackId,
    thumbnail: thumb,
    lines,
    fullCols, fullRows,
    playerLines, playerCols, playerRows,
    cols: vizCols, rows: vizRows,
    padFingerprint,
  };
```

- [ ] **Step 4: Run — expect pass**

Run: `npx tsx --test src/album/converter.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/album/converter.ts src/album/converter.test.ts
git commit -m "converter: add 4x4 binary padFingerprint for queue pad icons"
```

---

## Task 10: queuePads widget

**Files:**
- Create: `src/player/widgets/queuePads.ts`
- Test: `src/player/widgets/queuePads.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/player/widgets/queuePads.test.ts`:

```ts
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
  // set pad 0 fingerprint to all 1s, pad 1 to all 0s
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
  // Accent SGR must appear in at least one cell
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
```

- [ ] **Step 2: Run — expect fail**

Run: `npx tsx --test src/player/widgets/queuePads.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/player/widgets/queuePads.ts`:

```ts
import type { Renderer } from "../../ui/renderer.js";
import type { Region } from "../../ui/tui.js";
import type { AppState } from "../state.js";
import type { Theme } from "../theme.js";
import { computeDna } from "../trackDna.js";

const PAD_W = 8;
const PAD_H = 6;

function shortName(name: string): string {
  return name.slice(0, 3).toLowerCase().padEnd(3, "·");
}

export function renderQueuePads(
  r: Renderer,
  region: Region,
  state: AppState,
  theme: Theme,
): void {
  if (region.width < 8 || region.height < 4) return;

  const xi = region.x + 2;
  r.write(xi, region.y, `${theme.dim}[ pads · queue 1/8 ]${theme.reset}`);

  const gridX = region.x + 1;
  const gridY = region.y + 2;
  for (let i = 0; i < 8; i++) {
    const row = Math.floor(i / 4);
    const col = i % 4;
    const x = gridX + col * PAD_W;
    const y = gridY + row * (PAD_H + 1);
    drawPad(r, x, y, i, state, theme);
  }

  // Footer
  const activeName = state.recentlyPlayed[0]?.trackName ?? "\u2014";
  const activeId = state.recentlyPlayed[0]
    ? `${state.recentlyPlayed[0].trackName}|${state.recentlyPlayed[0].artistName}`
    : "";
  const dna = activeId ? computeDna(activeId) : null;
  const bpm = dna ? `${dna.bpm}bpm` : "---bpm";
  const footer = `\u25B8 pad ${String(state.activePadIndex + 1).padStart(2,"0")} \u00B7 ${activeName.slice(0, 10)} \u00B7 ${bpm}`;
  r.write(xi, region.y + region.height - 2, `${theme.dim}${footer.slice(0, region.width - 4)}${theme.reset}`);
  r.write(xi, region.y + region.height - 1, `${theme.dim}${"\u00B7 ".repeat(Math.max(0, Math.floor((region.width - 4) / 2)))}${theme.reset}`);
}

function drawPad(
  r: Renderer,
  x: number,
  y: number,
  index: number,
  state: AppState,
  theme: Theme,
): void {
  const isActive = index === state.activePadIndex;
  const headerColor = isActive ? theme.accent : theme.dim;
  const track = state.recentlyPlayed[index];
  const name = track ? shortName(track.trackName) : "\u00B7\u00B7\u00B7";
  const numLabel = String(index + 1).padStart(2, "0");
  const fp = state.padFingerprints[index] ?? new Uint8Array(16);

  r.write(x, y,     `${headerColor}\u250C${numLabel}\u2500\u2500\u2510${theme.reset}`);
  for (let row = 0; row < 4; row++) {
    let cells = "";
    for (let col = 0; col < 4; col++) {
      cells += fp[row * 4 + col] ? "\u25CF" : "\u00B7";
    }
    r.write(x, y + 1 + row, `${theme.dim}\u2502${cells}\u2502${theme.reset}`);
  }
  r.write(x, y + 5, `${headerColor}\u2514${name}\u2500\u2500\u2518${theme.reset}`);
}
```

- [ ] **Step 4: Run — expect pass**

Run: `npx tsx --test src/player/widgets/queuePads.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/player/widgets/queuePads.ts src/player/widgets/queuePads.test.ts
git commit -m "queuePads: 8-pad queue grid with dot-fingerprint icons"
```

---

## Task 11: Rewrite albumArt widget (framed screen + footer + scanline flash)

**Files:**
- Modify: `src/player/widgets/albumArt.ts`
- Test: `src/player/widgets/albumArt.test.ts` (existing — rewrite)

- [ ] **Step 1: Replace tests**

Overwrite `src/player/widgets/albumArt.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert";
import { Renderer } from "../../ui/renderer.js";
import { renderAlbumArt } from "./albumArt.js";
import { createInitialState } from "../state.js";
import { buildTheme } from "../theme.js";

test("renderAlbumArt draws the framed [ screen · NNN ] label", () => {
  const r = new Renderer(40, 15);
  const s = createInitialState(40, 15);
  s.recentlyPlayed = [{
    trackName: "x", artistName: "y", albumName: "z", albumArtUrl: "", deviceName: "s",
    isPlaying: true, progressMs: 0, durationMs: 0,
  }];
  renderAlbumArt(r, { x: 0, y: 0, width: 40, height: 15 }, s, buildTheme(0, true));
  const all = r.debugLines().join("\n");
  assert.match(all, /screen \u00B7 \d{3}/);
});

test("renderAlbumArt footer shows metadata row", () => {
  const r = new Renderer(40, 15);
  const s = createInitialState(40, 15);
  s.rms = 0.73;
  renderAlbumArt(r, { x: 0, y: 0, width: 40, height: 15 }, s, buildTheme(0, true));
  const all = r.debugLines().join("\n");
  assert.ok(all.includes("rms 0.73"));
});

test("renderAlbumArt shows — no art — when albumArt null", () => {
  const r = new Renderer(40, 15);
  const s = createInitialState(40, 15);
  renderAlbumArt(r, { x: 0, y: 0, width: 40, height: 15 }, s, buildTheme(0, true));
  const all = r.debugLines().join("\n");
  assert.ok(all.includes("no art") || all.includes("\u2014"));
});

test("blank mode shows [ OFF ]", () => {
  const r = new Renderer(40, 15);
  const s = createInitialState(40, 15);
  s.artCellMode = "blank";
  renderAlbumArt(r, { x: 0, y: 0, width: 40, height: 15 }, s, buildTheme(0, true));
  const all = r.debugLines().join("\n");
  assert.ok(all.includes("OFF"));
});
```

- [ ] **Step 2: Run — expect fail**

Run: `npx tsx --test src/player/widgets/albumArt.test.ts`
Expected: some assertions fail (label format, footer missing).

- [ ] **Step 3: Rewrite widget**

Overwrite `src/player/widgets/albumArt.ts`:

```ts
import type { Renderer } from "../../ui/renderer.js";
import type { Region } from "../../ui/tui.js";
import type { AppState } from "../state.js";
import type { Theme } from "../theme.js";
import { catalogNumber } from "../trackDna.js";

const TL = "\u256D", TR = "\u256E", BL = "\u2570", BR = "\u256F";
const H = "\u2500", V = "\u2502";

export function renderAlbumArt(
  r: Renderer,
  region: Region,
  state: AppState,
  theme: Theme,
): void {
  const head = state.recentlyPlayed[0];
  const idSrc = head ? `${head.trackName}|${head.artistName}` : "unknown";
  const cat = catalogNumber(idSrc);
  const label = `[ screen \u00B7 ${cat} ]`;

  const frameX = region.x + 1;
  const frameY = region.y;
  const frameW = region.width - 2;
  const frameH = region.height - 5;        // leave 4 rows for footer + 1 blank

  if (frameW < 6 || frameH < 3) return;

  // Top border with inline label
  const labelPad = Math.max(0, frameW - label.length - 4);
  r.write(frameX, frameY, `${theme.dim}${TL}${H}${label}${H.repeat(labelPad)}${H}${TR}${theme.reset}`);

  // Side walls
  for (let y = frameY + 1; y < frameY + frameH - 1; y++) {
    r.write(frameX, y, `${theme.dim}${V}${theme.reset}`);
    r.write(frameX + frameW - 1, y, `${theme.dim}${V}${theme.reset}`);
  }
  r.write(frameX, frameY + frameH - 1, `${theme.dim}${BL}${H.repeat(frameW - 2)}${BR}${theme.reset}`);

  const artX = frameX + 1;
  const artY = frameY + 1;
  const artW = frameW - 2;
  const artH = frameH - 2;

  if (state.artCellMode === "blank") {
    const msg = "[ OFF ]";
    const cx = artX + Math.floor((artW - msg.length) / 2);
    const cy = artY + Math.floor(artH / 2);
    r.write(cx, cy, `${theme.dim}${msg}${theme.reset}`);
  } else if (state.artCellMode === "vu") {
    const lvl = Math.round((state.meterL + state.meterR) / 2 * artH);
    for (let row = 0; row < artH; row++) {
      const y = artY + artH - 1 - row;
      const ch = row < lvl ? "\u2588".repeat(artW) : " ".repeat(artW);
      r.write(artX, y, `${theme.meter}${ch}${theme.reset}`);
    }
  } else {
    const art = state.albumArt;
    if (!art) {
      const msg = "\u2014 no art \u2014";
      const cx = artX + Math.floor((artW - msg.length) / 2);
      const cy = artY + Math.floor(artH / 2);
      r.write(cx, cy, `${theme.dim}${msg}${theme.reset}`);
    } else {
      const lines = art.lines;
      for (let i = 0; i < Math.min(artH, lines.length); i++) {
        r.write(artX, artY + i, lines[i]);
      }
    }
  }

  // Footer strip (4 rows under frame)
  const fy = frameY + frameH;
  const fx = frameX;
  const fw = frameW;
  const pad = "\u00B7".repeat(Math.max(0, fw - 4));
  r.write(fx, fy, `${theme.dim}  \u25E6 ansilize \u00B7 2\u00D74 braille${theme.reset}`);
  r.write(fx, fy + 1, `${theme.dim}  \u25CF peak hold  \u00B7 \u25CF over  \u00B7 \u25CF lim${theme.reset}`);
  const rmsTxt = state.rms.toFixed(2);
  r.write(fx, fy + 2, `${theme.dim}  \u25E6 rms ${rmsTxt}  \u25E6 lufs ${Math.round(-20 + state.rms * 14)}${theme.reset}`);
  r.write(fx, fy + 3, `${theme.dim}  ${pad.slice(0, fw - 4)}${theme.reset}`);
}
```

- [ ] **Step 4: Run — expect pass**

Run: `npx tsx --test src/player/widgets/albumArt.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/player/widgets/albumArt.ts src/player/widgets/albumArt.test.ts
git commit -m "albumArt: frame the screen, add footer strip with rms/lufs readouts"
```

---

## Task 12: Update spectrum widget (Hz labels + peak-hold + bass accent + footer)

**Files:**
- Modify: `src/player/widgets/spectrum.ts`
- Test: `src/player/widgets/spectrum.test.ts` (existing — update)

- [ ] **Step 1: Replace tests**

Overwrite `src/player/widgets/spectrum.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert";
import { Renderer } from "../../ui/renderer.js";
import { renderSpectrum } from "./spectrum.js";
import { createInitialState } from "../state.js";
import { buildTheme } from "../theme.js";

test("spectrum renders header with palette name and peak", () => {
  const r = new Renderer(80, 12);
  const s = createInitialState(80, 12);
  renderSpectrum(r, { x: 0, y: 0, width: 80, height: 12 }, s, buildTheme(0, true), new Set());
  const all = r.debugLines().join("\n");
  assert.match(all, /spectrum/i);
  assert.match(all, /amber|warm|AMBER/i);
});

test("spectrum shows Hz-label row", () => {
  const r = new Renderer(80, 12);
  const s = createInitialState(80, 12);
  renderSpectrum(r, { x: 0, y: 0, width: 80, height: 12 }, s, buildTheme(0, true), new Set());
  const all = r.debugLines().join("\n");
  assert.ok(all.includes("62") && all.includes("1k") && all.includes("8k"));
});

test("spectrum shows peak-hold ● row", () => {
  const r = new Renderer(80, 12);
  const s = createInitialState(80, 12);
  for (let i = 0; i < 16; i++) s.spectrum[i] = 0.5;
  renderSpectrum(r, { x: 0, y: 0, width: 80, height: 12 }, s, buildTheme(0, true), new Set());
  const all = r.debugLines().join("\n");
  assert.ok(all.includes("\u25CF"), "peak-hold ● row missing");
});

test("bass-bin accent applied when target set includes bass-bin", () => {
  const r = new Renderer(80, 12);
  const s = createInitialState(80, 12);
  s.spectrum[0] = 0.9;
  const theme = buildTheme(0, false);
  renderSpectrum(r, { x: 0, y: 0, width: 80, height: 12 }, s, theme, new Set(["bass-bin"]));
  const raw = (r as any).cells.join("");
  assert.ok(raw.includes(theme.accent), "accent not applied to bass bin");
});
```

- [ ] **Step 2: Run — expect fail**

Run: `npx tsx --test src/player/widgets/spectrum.test.ts`
Expected: FAIL — signature mismatch (new Set argument).

- [ ] **Step 3: Rewrite widget**

Overwrite `src/player/widgets/spectrum.ts`:

```ts
import type { Renderer } from "../../ui/renderer.js";
import type { Region } from "../../ui/tui.js";
import type { AppState } from "../state.js";
import type { Theme } from "../theme.js";
import { createPeakHold, updatePeakHold, type PeakHoldBuffer } from "../peakHold.js";
import type { AccentTarget } from "../accentArbiter.js";

const NUM_BARS = 16;
const PALETTE_NAMES = ["amber", "teal", "magenta", "mono"];
const HZ_LABELS = ["62", "125", "250", "500", "1k", "2k", "4k", "8k"];

let holdBuf: PeakHoldBuffer | null = null;

export function renderSpectrum(
  r: Renderer,
  region: Region,
  state: AppState,
  theme: Theme,
  accent: Set<AccentTarget>,
): void {
  if (region.width < 20 || region.height < 6) return;
  const xi = region.x + 2;
  const paletteName = PALETTE_NAMES[state.spectrumPaletteIndex % PALETTE_NAMES.length];
  const peak = state.meterL > state.meterR ? state.meterL : state.meterR;
  const peakDb = peak > 0 ? (20 * Math.log10(peak)).toFixed(1) : "-inf";
  r.write(xi, region.y, `${theme.dim}[ spectrum \u00B7 16b \u00B7 ${paletteName} \u00B7 peak ${peakDb} dbtp ]${theme.reset}`);

  const plotY = region.y + 2;
  const plotH = region.height - 4;
  const plotX = region.x + 2;
  const plotW = region.width - 4;
  const barW = Math.max(1, Math.floor(plotW / NUM_BARS));

  // Peak-hold update
  if (!holdBuf) holdBuf = createPeakHold(NUM_BARS);
  updatePeakHold(holdBuf, state.spectrum, Date.now(), 1500);

  // Hz label row (above bars)
  const labelRow = region.y + 1;
  let lx = plotX;
  for (const lbl of HZ_LABELS) {
    r.write(lx, labelRow, `${theme.dim}${lbl}${theme.reset}`);
    lx += barW * 2;
  }

  // Bars
  for (let b = 0; b < NUM_BARS; b++) {
    const mag = Math.max(0, Math.min(1, state.spectrum[b] ?? 0));
    const totalHalfRows = Math.round(mag * plotH * 2);
    const full = Math.floor(totalHalfRows / 2);
    const half = totalHalfRows % 2;
    const xStart = plotX + b * barW;
    const isBass = b === 0 && accent.has("bass-bin");
    const color = isBass ? theme.accent : theme.spectrum[b];
    for (let i = 0; i < full; i++) {
      const y = plotY + plotH - 1 - i;
      r.write(xStart, y, `${color}${"\u2588".repeat(barW)}${theme.reset}`);
    }
    if (half > 0) {
      const y = plotY + plotH - 1 - full;
      r.write(xStart, y, `${color}${"\u2584".repeat(barW)}${theme.reset}`);
    }

    // Peak-hold dot
    const held = holdBuf.values[b];
    if (held > 0) {
      const heldRow = Math.round(held * plotH * 2) / 2;
      const y = plotY + plotH - 1 - Math.floor(heldRow);
      if (y >= plotY && y < plotY + plotH) {
        r.write(xStart, y, `${theme.accent}\u25CF${theme.reset}`);
      }
    }
  }

  // Footer
  const fy = region.y + region.height - 1;
  r.write(xi, fy, `${theme.dim}\u25CF peak-hold \u00B7 2s \u00B7 \u25E6 reset \u25E6 tilt \u25E6 a-weight${theme.reset}`);
}
```

- [ ] **Step 4: Run — expect pass**

Run: `npx tsx --test src/player/widgets/spectrum.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/player/widgets/spectrum.ts src/player/widgets/spectrum.test.ts
git commit -m "spectrum: add Hz labels, peak-hold dots, bass-bin accent, footer"
```

---

## Task 13: Progress waveform + LED chaser in controls

**Files:**
- Modify: `src/player/widgets/controls.ts`
- Test: `src/player/widgets/controls.test.ts` (existing — update)

- [ ] **Step 1: Replace tests**

Overwrite `src/player/widgets/controls.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert";
import { Renderer } from "../../ui/renderer.js";
import { renderControls } from "./controls.js";
import { createInitialState } from "../state.js";
import { buildTheme } from "../theme.js";
import { computeAppLayout } from "../layout.js";

test("progress row shows elapsed / total timestamps", () => {
  const r = new Renderer(120, 30);
  const s = createInitialState(120, 30);
  s.progressMs = 92_000;
  s.durationMs = 182_000;
  const L = computeAppLayout(120, 30);
  renderControls(r, L, s, buildTheme(0, true));
  const all = r.debugLines().join("\n");
  assert.ok(all.includes("01:32"));
  assert.ok(all.includes("03:02"));
});

test("progress row contains Braille waveform glyphs", () => {
  const r = new Renderer(120, 30);
  const s = createInitialState(120, 30);
  s.progressMs = 60_000; s.durationMs = 120_000;
  for (let i = 0; i < 64; i++) s.progressEnvelope[i] = 0.5;
  const L = computeAppLayout(120, 30);
  renderControls(r, L, s, buildTheme(0, true));
  const all = r.debugLines().join("\n");
  // Any of the Braille progress glyphs
  assert.ok(/[\u2800-\u28FF]/.test(all), "expected Braille glyph in progress row");
});

test("key legend row contains core hotkeys", () => {
  const r = new Renderer(120, 30);
  const s = createInitialState(120, 30);
  const L = computeAppLayout(120, 30);
  renderControls(r, L, s, buildTheme(0, true));
  const all = r.debugLines().join("\n");
  assert.ok(all.includes("[p]"));
  assert.ok(all.includes("[q]"));
  assert.ok(all.includes("[1-8]"));
});

test("LED chaser strip renders ●/· pattern", () => {
  const r = new Renderer(120, 30);
  const s = createInitialState(120, 30);
  s.ledChaserIndex = 5;
  const L = computeAppLayout(120, 30);
  renderControls(r, L, s, buildTheme(0, true));
  const all = r.debugLines().join("\n");
  assert.ok(all.includes("\u25CF"), "expected ● in LED strip");
});
```

- [ ] **Step 2: Run — expect fail**

Run: `npx tsx --test src/player/widgets/controls.test.ts`
Expected: FAIL — no Braille glyph, no `[1-8]` hint, no ● chaser.

- [ ] **Step 3: Rewrite controls**

Overwrite `src/player/widgets/controls.ts`:

```ts
import type { Renderer } from "../../ui/renderer.js";
import type { AppState } from "../state.js";
import type { Theme } from "../theme.js";
import type { AppLayout } from "../layout.js";

const BRAILLE_HEIGHTS = [
  " ",
  "\u2840", // ⡀
  "\u2844", // ⡄
  "\u2846", // ⡆
  "\u2847", // ⡇
  "\u28C7", // ⣇
  "\u28E7", // ⣧
  "\u28F7", // ⣷
  "\u28FF", // ⣿
];

function fmtMs(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const ss = (s % 60).toString().padStart(2, "0");
  const mm = m.toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

export function renderControls(
  r: Renderer,
  L: AppLayout,
  state: AppState,
  theme: Theme,
): void {
  const left = fmtMs(state.progressMs);
  const right = fmtMs(state.durationMs);
  const y = L.scrubR.y;
  const x0 = L.scrubR.x + 1;
  const xLast = L.scrubR.x + L.scrubR.width - 2;
  r.write(x0, y, `${theme.fg}${left}${theme.reset}`);
  r.write(xLast - right.length + 1, y, `${theme.fg}${right}${theme.reset}`);

  const waveX0 = x0 + left.length + 1;
  const waveX1 = xLast - right.length - 1;
  const waveW = Math.max(0, waveX1 - waveX0);
  const pct = state.durationMs > 0 ? Math.min(1, state.progressMs / state.durationMs) : 0;
  const playheadX = waveX0 + Math.round(pct * waveW);
  const envLen = state.progressEnvelope.length;

  for (let x = 0; x < waveW; x++) {
    const envIdx = Math.floor((x / waveW) * envLen);
    const v = Math.max(0, Math.min(1, state.progressEnvelope[envIdx] ?? 0));
    const absX = waveX0 + x;
    const past = absX <= playheadX;
    let glyph: string;
    if (absX === playheadX) {
      glyph = BRAILLE_HEIGHTS[8];
    } else if (past) {
      const idx = Math.round(v * 8);
      glyph = BRAILLE_HEIGHTS[Math.max(0, Math.min(8, idx))];
    } else {
      glyph = "\u00B7";
    }
    const color = absX === playheadX ? theme.accent : past ? theme.fg : theme.dim;
    r.write(absX, y, `${color}${glyph}${theme.reset}`);
  }

  // Legend + LED strip on keysR row
  const legend = "[p]lay [n]xt [b]ck [m]ute [v]is [a]rt [/]srch [1-8]pad [q]uit";
  const legendX = L.keysR.x + 1;
  r.write(legendX, L.keysR.y, `${theme.dim}${legend.slice(0, Math.min(legend.length, L.keysR.width - 22))}${theme.reset}`);

  const ledCount = 21;
  const ledX0 = L.keysR.x + L.keysR.width - ledCount * 2 - 1;
  for (let i = 0; i < ledCount; i++) {
    const x = ledX0 + i * 2;
    const lit = i === state.ledChaserIndex && state.isPlaying;
    const ch = lit ? `${theme.accent}\u25CF${theme.reset}` : `${theme.dim}\u00B7${theme.reset}`;
    r.write(x, L.keysR.y, ch);
  }
}
```

- [ ] **Step 4: Run — expect pass**

Run: `npx tsx --test src/player/widgets/controls.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/player/widgets/controls.ts src/player/widgets/controls.test.ts
git commit -m "controls: Braille-waveform progress + LED chaser strip"
```

---

## Task 14: Rewrite nowPlaying widget

**Files:**
- Modify: `src/player/widgets/nowPlaying.ts`
- Test: `src/player/widgets/nowPlaying.test.ts` (existing — update)

- [ ] **Step 1: Replace tests**

Overwrite `src/player/widgets/nowPlaying.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert";
import { Renderer } from "../../ui/renderer.js";
import { renderNowPlaying } from "./nowPlaying.js";
import { createInitialState } from "../state.js";
import { buildTheme } from "../theme.js";

function setupState(track: string, artist: string) {
  const s = createInitialState(40, 15);
  s.nowPlaying = {
    trackName: track, artistName: artist, albumName: "album",
    albumArtUrl: "", deviceName: "s",
    isPlaying: true, progressMs: 0, durationMs: 200000,
  };
  s.isPlaying = true;
  s.meterL = 0.73;
  s.meterR = 0.68;
  return s;
}

test("title row shows ▸ {trackName}", () => {
  const r = new Renderer(40, 15);
  const s = setupState("killer on the loose", "rex vijayan");
  renderNowPlaying(r, { x: 0, y: 0, width: 40, height: 15 }, s, buildTheme(0, true));
  const all = r.debugLines().join("\n");
  assert.ok(all.includes("\u25B8 killer"));
  assert.ok(all.includes("rex vijayan"));
});

test("DNA strip shows bpm key lufs with track-varying values", () => {
  const r = new Renderer(40, 15);
  const s = setupState("track a", "artist a");
  renderNowPlaying(r, { x: 0, y: 0, width: 40, height: 15 }, s, buildTheme(0, true));
  const all = r.debugLines().join("\n");
  assert.match(all, /bpm \d+/);
  assert.match(all, /key [a-g]#?/i);
  assert.match(all, /-\d+ lufs/);
});

test("DNA strip shows engine/valence/dance/aco gauges", () => {
  const r = new Renderer(40, 15);
  const s = setupState("track a", "artist a");
  renderNowPlaying(r, { x: 0, y: 0, width: 40, height: 15 }, s, buildTheme(0, true));
  const all = r.debugLines().join("\n");
  assert.match(all, /eng /);
  assert.match(all, /val /);
  assert.match(all, /dan /);
  assert.match(all, /aco /);
});

test("meter strip shows L and R with percentages", () => {
  const r = new Renderer(40, 15);
  const s = setupState("a", "b");
  renderNowPlaying(r, { x: 0, y: 0, width: 40, height: 15 }, s, buildTheme(0, true));
  const all = r.debugLines().join("\n");
  assert.match(all, /L .* 73%/);
  assert.match(all, /R .* 68%/);
});

test("transport strip shows play/stop/rec/loop glyphs", () => {
  const r = new Renderer(40, 15);
  const s = setupState("a", "b");
  renderNowPlaying(r, { x: 0, y: 0, width: 40, height: 15 }, s, buildTheme(0, true));
  const all = r.debugLines().join("\n");
  assert.ok(all.includes("\u25B7"), "expected ▷ play glyph");
  assert.ok(all.includes("\u25A0"), "expected ■ stop glyph");
  assert.ok(all.includes("\u25C9"), "expected ◉ rec glyph");
});

test("shows — no track — when nowPlaying is null", () => {
  const r = new Renderer(40, 15);
  const s = createInitialState(40, 15);
  renderNowPlaying(r, { x: 0, y: 0, width: 40, height: 15 }, s, buildTheme(0, true));
  const all = r.debugLines().join("\n");
  assert.ok(all.includes("\u2014") || all.includes("no track"));
});
```

- [ ] **Step 2: Run — expect fail**

Run: `npx tsx --test src/player/widgets/nowPlaying.test.ts`
Expected: FAIL.

- [ ] **Step 3: Rewrite widget**

Overwrite `src/player/widgets/nowPlaying.ts`:

```ts
import type { Renderer } from "../../ui/renderer.js";
import type { Region } from "../../ui/tui.js";
import type { AppState } from "../state.js";
import type { Theme } from "../theme.js";
import { computeDna, catalogNumber } from "../trackDna.js";

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, Math.max(0, max - 1)) + "\u2026";
}

function vuBar(level: number, width: number): string {
  const clamped = Math.max(0, Math.min(1, level));
  const fill = Math.round(clamped * width);
  let out = "";
  for (let i = 0; i < width; i++) {
    out += i < fill ? "\u2588" : "\u00B7";
  }
  return out;
}

function gauge(value: number, width: number): string {
  const fill = Math.round((value / 100) * width);
  let out = "";
  for (let i = 0; i < width; i++) out += i < fill ? "\u25AE" : "\u25AF";
  return out;
}

function dotRule(label: string, width: number, theme: Theme): string {
  const inner = ` ${label} `;
  const dashes = Math.max(0, width - inner.length);
  const left = Math.floor(dashes / 2);
  const right = dashes - left;
  return `${theme.dim}${"\u00B7".repeat(left)}${inner}${"\u00B7".repeat(right)}${theme.reset}`;
}

export function renderNowPlaying(
  r: Renderer,
  region: Region,
  state: AppState,
  theme: Theme,
): void {
  if (region.width < 24 || region.height < 12) return;

  const xi = region.x + 2;
  const pad = region.width - 4;
  const np = state.nowPlaying;

  // Panel label (row 0)
  const cat = np ? catalogNumber(`${np.trackName}|${np.artistName}`) : "000";
  r.write(xi, region.y, `${theme.dim}[ now \u00B7 track ${cat} ]${theme.reset}`);

  if (!np) {
    r.write(xi, region.y + 2, `${theme.dim}\u2014 no track \u2014${theme.reset}`);
    return;
  }

  // Title + artist (rows 1, 2)
  r.write(xi, region.y + 1, `${theme.fg}\u25B8 ${truncate(np.trackName, pad - 2)}${theme.reset}`);
  r.write(xi, region.y + 2, `${theme.dim}\u25E6 ${truncate(np.artistName, pad - 2)}${theme.reset}`);

  // Track DNA strip (rows 3-6)
  r.write(xi, region.y + 3, dotRule("track dna", pad, theme));
  const dna = computeDna(`${np.trackName}|${np.artistName}`);
  r.write(xi, region.y + 4,
    `${theme.dim}bpm ${dna.bpm} \u00B7 key ${dna.key}${dna.keyMode === "min" ? "m" : ""} \u00B7 ${dna.lufs} lufs${theme.reset}`);
  r.write(xi, region.y + 5,
    `${theme.dim}eng ${gauge(dna.energy, 7)} ${String(dna.energy).padStart(2," ")}  val ${gauge(dna.valence, 7)} ${String(dna.valence).padStart(2," ")}${theme.reset}`);
  r.write(xi, region.y + 6,
    `${theme.dim}dan ${gauge(dna.danceability, 7)} ${String(dna.danceability).padStart(2," ")}  aco ${gauge(dna.acousticness, 7)} ${String(dna.acousticness).padStart(2," ")}${theme.reset}`);

  // Meter strip (rows 7-10)
  r.write(xi, region.y + 7, dotRule("meter strip", pad, theme));
  const barW = Math.max(6, pad - 10);
  const lPct = Math.round(state.meterL * 100).toString().padStart(3, " ") + "%";
  const rPct = Math.round(state.meterR * 100).toString().padStart(3, " ") + "%";
  r.write(xi, region.y + 8, `${theme.dim}L ${theme.meter}${vuBar(state.meterL, barW)}${theme.dim} ${lPct}${theme.reset}`);
  r.write(xi, region.y + 9, `${theme.dim}R ${theme.meter}${vuBar(state.meterR, barW)}${theme.dim} ${rPct}${theme.reset}`);
  const peakDb = Math.max(state.meterL, state.meterR) > 0
    ? (20 * Math.log10(Math.max(state.meterL, state.meterR))).toFixed(1)
    : "-inf";
  r.write(xi, region.y + 10, `${theme.dim}\u25E6peak ${peakDb} \u25E6clip 0 \u25E6lim 0${theme.reset}`);

  // Transport strip (rows 11-13)
  if (region.height >= 13) {
    r.write(xi, region.y + 11, dotRule("transport", pad, theme));
    const playGlyph = state.isPlaying ? "\u25B7" : "\u25AF\u25AF";
    r.write(xi, region.y + 12, `${theme.fg}[${playGlyph} play] [\u25A0 stop] [\u25C9 rec] [\u27F2]${theme.reset}`);
  }
  if (region.height >= 14) {
    r.write(xi, region.y + 13, `${theme.dim}pgm 01 \u00B7 bnk a \u00B7 ${dna.bpm}bpm \u00B7 ${dna.key}${theme.reset}`);
  }
}
```

- [ ] **Step 4: Run — expect pass**

Run: `npx tsx --test src/player/widgets/nowPlaying.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/player/widgets/nowPlaying.ts src/player/widgets/nowPlaying.test.ts
git commit -m "nowPlaying: title/DNA/meters/transport sub-sections with fudged DNA"
```

---

## Task 15: Rewrite lyrics widget to delegate active line to bigLyric

**Files:**
- Modify: `src/player/widgets/lyrics.ts`
- Test: `src/player/widgets/lyrics.test.ts` (existing — update)

- [ ] **Step 1: Replace tests**

Overwrite `src/player/widgets/lyrics.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert";
import { Renderer } from "../../ui/renderer.js";
import { renderLyrics } from "./lyrics.js";
import { createInitialState } from "../state.js";
import { buildTheme } from "../theme.js";

test("lyrics panel shows header label", () => {
  const r = new Renderer(60, 10);
  const s = createInitialState(60, 10);
  renderLyrics(r, { x: 0, y: 0, width: 60, height: 10 }, s, buildTheme(0, true), new Set());
  assert.match(r.debugLines().join("\n"), /lyrics/);
});

test("active lyric renders in bitfont when lyrics present", () => {
  const r = new Renderer(60, 10);
  const s = createInitialState(60, 10);
  s.lyrics = [{ timeMs: 0, text: "HI" }, { timeMs: 1000, text: "HELLO" }];
  s.activeLyricIndex = 0;
  renderLyrics(r, { x: 0, y: 0, width: 60, height: 10 }, s, buildTheme(0, true), new Set());
  const all = r.debugLines().join("\n");
  // Half-block glyphs only appear via bitfont path
  assert.ok(/[\u2580\u2584\u2588]/.test(all), "expected half-block glyph");
});

test("prev/next lines are shown in dim context", () => {
  const r = new Renderer(60, 10);
  const s = createInitialState(60, 10);
  s.lyrics = [{ timeMs: 0, text: "PREV" }, { timeMs: 1000, text: "NOW" }, { timeMs: 2000, text: "NEXT" }];
  s.activeLyricIndex = 1;
  renderLyrics(r, { x: 0, y: 0, width: 60, height: 10 }, s, buildTheme(0, true), new Set());
  const all = r.debugLines().join("\n");
  assert.ok(all.toLowerCase().includes("prev"));
  assert.ok(all.toLowerCase().includes("next"));
});

test("shows — no lyrics — when list empty", () => {
  const r = new Renderer(60, 10);
  const s = createInitialState(60, 10);
  renderLyrics(r, { x: 0, y: 0, width: 60, height: 10 }, s, buildTheme(0, true), new Set());
  const all = r.debugLines().join("\n");
  assert.ok(all.includes("\u2014") || all.includes("no lyrics"));
});
```

- [ ] **Step 2: Run — expect fail**

Run: `npx tsx --test src/player/widgets/lyrics.test.ts`
Expected: FAIL.

- [ ] **Step 3: Rewrite widget**

Overwrite `src/player/widgets/lyrics.ts`:

```ts
import type { Renderer } from "../../ui/renderer.js";
import type { Region } from "../../ui/tui.js";
import type { AppState } from "../state.js";
import type { Theme } from "../theme.js";
import type { AccentTarget } from "../accentArbiter.js";
import { renderBigLyric } from "./bigLyric.js";

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, Math.max(0, max - 1)) + "\u2026";
}

export function renderLyrics(
  r: Renderer,
  region: Region,
  state: AppState,
  theme: Theme,
  accent: Set<AccentTarget>,
): void {
  if (region.width < 20 || region.height < 4) return;

  const xi = region.x + 2;
  const pad = region.width - 4;
  r.write(xi, region.y, `${theme.dim}[ lyrics \u00B7 sync rms ${state.rms.toFixed(2)} \u00B7 lrclib ]${theme.reset}`);

  if (state.lyrics.length === 0) {
    r.write(xi, region.y + 2, `${theme.dim}\u2014 no lyrics \u2014${theme.reset}`);
    return;
  }

  const idx = state.activeLyricIndex;
  const prev = idx > 0 ? state.lyrics[idx - 1]?.text : null;
  const active = idx >= 0 ? state.lyrics[idx]?.text : null;
  const next = idx + 1 < state.lyrics.length ? state.lyrics[idx + 1]?.text : null;

  if (prev) {
    r.write(xi, region.y + 1, `${theme.dim}\u00B7 ${truncate(prev, pad - 2)}${theme.reset}`);
  }

  if (active) {
    const bright = accent.has("sync") || accent.has("bass-bin");
    renderBigLyric(
      r,
      { x: region.x, y: region.y + 1, width: region.width, height: Math.min(region.height - 2, 5) },
      { text: active, bright },
      theme,
    );
  }

  if (next && region.height >= 8) {
    r.write(xi, region.y + region.height - 2, `${theme.dim}\u00B7 ${truncate(next, pad - 2)}${theme.reset}`);
  }
  const dotRow = region.y + region.height - 1;
  const dots = "\u00B7 ".repeat(Math.floor(pad / 2));
  r.write(xi, dotRow, `${theme.dim}${dots}${theme.reset}`);
}
```

- [ ] **Step 4: Run — expect pass**

Run: `npx tsx --test src/player/widgets/lyrics.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/player/widgets/lyrics.ts src/player/widgets/lyrics.test.ts
git commit -m "lyrics: delegate active line to bigLyric, show prev/next dim context"
```

---

## Task 16: Update titleBar widget (2 rows + status LEDs)

**Files:**
- Modify: `src/player/widgets/titleBar.ts`
- Test: `src/player/widgets/titleBar.test.ts` (existing — update)

Note: The spec wireframe shows two rows of title-bar content (brand+search+sysLoad on row 0; LED strip on row 1). For this implementation cycle, the LED strip is folded horizontally onto the single `titleBar` row (width 1) next to the brand — `brandR` widened to 50 cols in Task 6 makes room for both. Two-row title bar would be a layout change that cascades to all separator Y coordinates and can be reconsidered later.

- [ ] **Step 1: Replace tests**

Overwrite `src/player/widgets/titleBar.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert";
import { Renderer } from "../../ui/renderer.js";
import { renderTitleBar } from "./titleBar.js";
import { computeAppLayout } from "../layout.js";
import { createInitialState } from "../state.js";
import { buildTheme } from "../theme.js";

test("titleBar shows TUI·AMP brand", () => {
  const r = new Renderer(120, 30);
  const s = createInitialState(120, 30);
  const L = computeAppLayout(120, 30);
  renderTitleBar(r, L, s, buildTheme(0, true), new Set());
  assert.match(r.debugLines().join("\n"), /TUI\u00B7AMP/);
});

test("titleBar shows sys load with cpu + rms readouts", () => {
  const r = new Renderer(120, 30);
  const s = createInitialState(120, 30);
  s.cpuPct = 19.7;
  s.rms = 0.73;
  const L = computeAppLayout(120, 30);
  renderTitleBar(r, L, s, buildTheme(0, true), new Set());
  const all = r.debugLines().join("\n");
  assert.match(all, /cpu\u00B7\s*19\.7/);
  assert.match(all, /rms\u00B7\s*0\.73/);
});

test("sync LED uses accent when sync in accent set", () => {
  const r = new Renderer(120, 30);
  const s = createInitialState(120, 30);
  const L = computeAppLayout(120, 30);
  const theme = buildTheme(0, false);
  renderTitleBar(r, L, s, theme, new Set(["sync"]));
  const raw = (r as any).cells.join("");
  assert.ok(raw.includes(theme.accent));
});

test("search hint shown when not focused", () => {
  const r = new Renderer(120, 30);
  const s = createInitialState(120, 30);
  const L = computeAppLayout(120, 30);
  renderTitleBar(r, L, s, buildTheme(0, true), new Set());
  assert.match(r.debugLines().join("\n"), /\/ to search/);
});
```

- [ ] **Step 2: Run — expect fail**

Run: `npx tsx --test src/player/widgets/titleBar.test.ts`
Expected: FAIL.

- [ ] **Step 3: Rewrite widget**

Overwrite `src/player/widgets/titleBar.ts`:

```ts
import type { Renderer } from "../../ui/renderer.js";
import type { AppState } from "../state.js";
import type { Theme } from "../theme.js";
import type { AppLayout } from "../layout.js";
import type { AccentTarget } from "../accentArbiter.js";
import { catalogNumber } from "../trackDna.js";

export function renderTitleBar(
  r: Renderer,
  L: AppLayout,
  state: AppState,
  theme: Theme,
  accent: Set<AccentTarget>,
): void {
  const cat = state.nowPlaying
    ? catalogNumber(`${state.nowPlaying.trackName}|${state.nowPlaying.artistName}`)
    : "000";

  const brand = `[ TUI\u00B7AMP \u25E6 ${cat} ]`;
  const syncColor = accent.has("sync") ? theme.accent : theme.dim;
  const ledStrip = `${theme.dim}\u25E6in\u25CF ${theme.reset}${theme.dim}\u25E6out\u25CF ${theme.reset}${syncColor}\u25E6sync\u25CF${theme.reset}${theme.dim} \u25E6midi\u25CF${theme.reset}`;
  r.write(L.brandR.x, L.brandR.y, `${theme.accent}${brand}${theme.reset} ${ledStrip}`);

  const sx = L.searchR.x;
  const sy = L.searchR.y;
  const sw = L.searchR.width;
  if (sw > 4) {
    if (state.search.focused) {
      const prefix = "> ";
      const visible = state.search.query.slice(-(sw - prefix.length - 1));
      r.write(sx + 1, sy, `${theme.fg}${prefix}${visible}${theme.reset}`);
    } else {
      const hint = "[ / to search ]";
      if (hint.length + 2 <= sw) {
        const hx = sx + Math.floor((sw - hint.length) / 2);
        r.write(hx, sy, `${theme.dim}${hint}${theme.reset}`);
      }
    }
  }

  const cpu = state.cpuPct.toFixed(1).padStart(4, " ");
  const rms = state.rms.toFixed(2);
  const right = `[ cpu\u00B7${cpu} \u00B7 rms\u00B7${rms} \u00B7 lufs\u00B7-8 ]`;
  const rx = L.sysLoadR.x + Math.max(0, L.sysLoadR.width - right.length);
  r.write(rx, L.sysLoadR.y, `${theme.dim}${right}${theme.reset}`);
}
```

- [ ] **Step 4: Run — expect pass**

Run: `npx tsx --test src/player/widgets/titleBar.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/player/widgets/titleBar.ts src/player/widgets/titleBar.test.ts
git commit -m "titleBar: status LEDs + cpu/rms/lufs readouts + sync strobe"
```

---

## Task 17: Wire App.ts (arbiter, queuePads, delete recentlyPlayed, pad keybinds)

**Files:**
- Modify: `src/player/App.ts`
- Modify: `src/ui/input.ts`
- Modify: `src/player/feeders/audioFeeder.ts` (set timestamp fields)
- Delete: `src/player/widgets/recentlyPlayed.ts`, `src/player/widgets/recentlyPlayed.test.ts`

- [ ] **Step 1: Extend InputEvent type with play_pad action**

In `src/ui/input.ts`, change the `InputEvent` type (lines 13-18):

```ts
export type InputEvent =
  | { kind: "hotkey"; action: HotkeyAction }
  | { kind: "play_pad"; slot: number }
  | { kind: "text"; char: string }
  | { kind: "edit"; op: "backspace" | "enter" | "escape" }
  | { kind: "nav"; dir: "up" | "down" | "left" | "right" }
  | { kind: "quit" };
```

In `dispatchKey`, inside the `if (mode === "hotkey")` branch (after line 44 `if (act) emit(...)`, add the pad digit handler **before** the `return`):

```ts
  if (mode === "hotkey") {
    const name = key.name ?? key.sequence ?? "";
    if (name.length === 1 && name >= "1" && name <= "8") {
      emit({ kind: "play_pad", slot: parseInt(name, 10) - 1 });
      return;
    }
    const act = HOTKEYS[name];
    if (act) emit({ kind: "hotkey", action: act });
    return;
  }
```

- [ ] **Step 2: Remove recentlyPlayed widget**

```bash
git rm src/player/widgets/recentlyPlayed.ts src/player/widgets/recentlyPlayed.test.ts
```

- [ ] **Step 3: Rewire App.ts imports and renderFrame**

Replace the widget import block at top of `src/player/App.ts`:

```ts
import { renderTitleBar } from "./widgets/titleBar.js";
import { renderAlbumArt } from "./widgets/albumArt.js";
import { renderNowPlaying } from "./widgets/nowPlaying.js";
import { renderQueuePads } from "./widgets/queuePads.js";
import { renderLyrics } from "./widgets/lyrics.js";
import { renderSpectrum } from "./widgets/spectrum.js";
import { renderControls } from "./widgets/controls.js";
import { resolveAccentTargets } from "./accentArbiter.js";
```

Replace the body of `renderFrame` region-render section with:

```ts
    const accent = resolveAccentTargets(this.state, Date.now());

    drawOuterFrame(this.renderer);
    drawHSeparator(this.renderer, L.sep1Y, { down: L.sep1Down, up: [] });
    drawHSeparator(this.renderer, L.sep2Y, { down: L.sep2Down, up: L.sep2Up });
    drawHSeparator(this.renderer, L.sep3Y, { down: [], up: L.sep3Up });
    drawVDivider(this.renderer, L.sep1Down[0], L.topRow.y, L.topRow.y + L.topRow.height - 1);
    drawVDivider(this.renderer, L.sep1Down[1], L.topRow.y, L.topRow.y + L.topRow.height - 1);
    drawVDivider(this.renderer, L.sep2Down[0], L.middleRow.y, L.middleRow.y + L.middleRow.height - 1);

    renderTitleBar(this.renderer, L, this.state, theme, accent);
    renderAlbumArt(this.renderer, L.screenR, this.state, theme);
    renderNowPlaying(this.renderer, L.nowR, this.state, theme);
    renderQueuePads(this.renderer, L.padsR, this.state, theme);
    renderLyrics(this.renderer, L.lyricsR, this.state, theme, accent);
    renderSpectrum(this.renderer, L.spectrumR, this.state, theme, accent);
    renderControls(this.renderer, L, this.state, theme);
```

Note: old layout used `L.artR`/`L.nowR`/`L.recentR`. New layout uses `L.screenR`/`L.nowR`/`L.padsR`. Update `fetchAlbumArt` call inside `startSpotifyFeeder` callback:

Find the line:
```ts
void fetchAlbumArt(this.state, artUrl, L.artR.width - 4, L.artR.height - 3, this.opts.noColor);
```

Change to:
```ts
void fetchAlbumArt(this.state, artUrl, L.screenR.width - 4, L.screenR.height - 7, this.opts.noColor);
```

- [ ] **Step 4: Add pad keybind handling**

In `src/player/App.ts` `handleInput`, add a `play_pad` branch at the top of the function (before the focused/unfocused split):

```ts
  private handleInput(e: InputEvent): void {
    if (e.kind === "quit") { void this.stop().then(() => process.exit(0)); return; }
    if (e.kind === "play_pad") {
      if (this.state.recentlyPlayed[e.slot]) this.state.activePadIndex = e.slot;
      return;
    }
    if (this.state.search.focused) {
      this.handleTextInput(e);
    } else {
      if (e.kind === "hotkey") this.handleHotkey(e.action);
    }
  }
```

Note: this cycle wires the keybind to update `activePadIndex` for visual feedback only. Actual track-play requires a Spotify URI which `DesktopState` does not carry (existing `recentlyPlayed` entries have `trackName`/`artistName` but no URI). Persisting URIs and hooking `spotifyDesktop.playTrack(uri)` is out of scope and tracked in spec §10.

- [ ] **Step 5: Populate reactivity fields in audioFeeder**

Overwrite `src/player/feeders/audioFeeder.ts` to track timestamps, rising-edge transients, LED chaser, and progress envelope:

```ts
import type { AudioSource } from "../../audio/AudioSource.js";
import type { AppState } from "../state.js";
import { computeMagnitudeSpectrum } from "../../dsp/fft.js";
import { computeBuckets } from "../../dsp/buckets.js";
import {
  smoothBuckets,
  smoothValue,
  DEFAULT_BAR_SMOOTHING,
  DEFAULT_ENERGY_SMOOTHING,
} from "../../dsp/smoothing.js";
import { extractFeatures } from "../../dsp/features.js";
import { mixToMono } from "../../dsp/deinterleave.js";
import { extractChannelPeaks } from "../../dsp/channelPeaks.js";

const NUM_BARS = 16;
const ENERGY_DECAY_PER_FRAME = 0.04;
const METER_SMOOTHING = { attack: 0.6, decay: 0.4 };
const TRANSIENT_PULSE_THRESHOLD = 0.55;
const PEAK_LEVEL = 0.92;
const CLIP_LEVEL = 0.99;
const LED_COUNT = 21;

export function startAudioFeeder(audio: AudioSource, state: AppState): void {
  const info = audio.getInfo();
  const bucketPeak = { value: 1e-6 };
  const prevBuckets = new Float32Array(NUM_BARS);
  let prevTransient = false;

  audio.onFrame((interleaved) => {
    const now = Date.now();
    const peaks = extractChannelPeaks(interleaved, info.numChannels);
    const l = peaks[0] ?? 0;
    const r = peaks[info.numChannels > 1 ? 1 : 0] ?? 0;
    state.meterL = smoothValue(state.meterL, l, METER_SMOOTHING);
    state.meterR = smoothValue(state.meterR, r, METER_SMOOTHING);

    const maxMeter = Math.max(state.meterL, state.meterR);
    if (maxMeter >= PEAK_LEVEL) state.lastPeakAt = now;
    if (l >= CLIP_LEVEL || r >= CLIP_LEVEL) state.lastClipAt = now;

    const mono = mixToMono(interleaved, info.numChannels);
    const spec = computeMagnitudeSpectrum(mono);
    const raw = computeBuckets(spec, NUM_BARS, info.sampleRate, bucketPeak);
    smoothBuckets(prevBuckets, raw, DEFAULT_BAR_SMOOTHING);
    for (let i = 0; i < NUM_BARS; i++) state.spectrum[i] = prevBuckets[i];

    const f = extractFeatures(spec, info.sampleRate);
    state.rms = smoothValue(state.rms, f.rms, DEFAULT_ENERGY_SMOOTHING);
    const transient = f.pulse >= TRANSIENT_PULSE_THRESHOLD;
    state.transientPeak = transient;
    state.transientEnergy = transient
      ? 1.0
      : Math.max(0, state.transientEnergy - ENERGY_DECAY_PER_FRAME);

    if (transient && !prevTransient) {
      state.lastTransientAt = now;
      state.ledChaserIndex = (state.ledChaserIndex + 1) % LED_COUNT;
    }
    prevTransient = transient;

    if (state.durationMs > 0) {
      const slot = Math.min(
        state.progressEnvelope.length - 1,
        Math.floor((state.progressMs / state.durationMs) * state.progressEnvelope.length),
      );
      if (state.progressEnvelope[slot] < state.rms) {
        state.progressEnvelope[slot] = state.rms;
      }
    }
  });
}
```

Then in `src/player/feeders/spotifyFeeder.ts`, find the callback path that fires on new-track detection (when `trackName` differs from the previous polled state). Inside that callback body, immediately after the existing `pushRecentlyPlayed` call, add:

```ts
  state.progressEnvelope.fill(0);
  state.activePadIndex = 0;
```

If you cannot locate a clean hook: append the two lines in the same block that calls the `onTrackChange` callback in App.ts (see existing `this.progressBaselineAt = Date.now();` — add the two lines next to it).

- [ ] **Step 6: Sync padFingerprints when album art arrives**

In `src/player/feeders/albumArtFeeder.ts`, after `state.albumArt = art;` add:

```ts
  state.padFingerprints[0] = art.padFingerprint;
  state.activePadIndex = 0;
```

- [ ] **Step 7: Build + full test run**

Run: `npm test`
Expected: build succeeds; the new tests from Tasks 1-16 pass; any remaining baseline failures from Task 0 still fail (no net regression).

- [ ] **Step 8: Commit**

```bash
git add src/player/App.ts src/ui/input.ts src/player/feeders/audioFeeder.ts src/player/feeders/albumArtFeeder.ts
git rm -f src/player/widgets/recentlyPlayed.ts src/player/widgets/recentlyPlayed.test.ts
git commit -m "App: wire dense-console widgets + accent arbiter + pad keybinds"
```

---

## Task 18: Integration smoke test

**Files:**
- Create: `src/player/App.test.ts`

- [ ] **Step 1: Write smoke test**

Create `src/player/App.test.ts`:

```ts
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

  // No ┼ crosses
  assert.ok(!joined.includes("\u253C"), "unexpected ┼ cross in frame");

  // Each panel label present
  for (const label of ["TUI\u00B7AMP", "screen \u00B7", "now \u00B7 track", "pads \u00B7 queue", "lyrics", "spectrum"]) {
    assert.ok(joined.includes(label), `missing label ${JSON.stringify(label)}`);
  }

  // Every row is exactly cols wide
  for (let y = 0; y < rows; y++) {
    assert.strictEqual(lines[y].length, cols, `row ${y} length ${lines[y].length}`);
  }
});
```

- [ ] **Step 2: Run — expect pass**

Run: `npx tsx --test src/player/App.test.ts`
Expected: PASS.

- [ ] **Step 3: Full suite**

Run: `npm test 2>&1 | tail -10`
Expected: pass count increased; no new regressions vs Task 0 baseline.

- [ ] **Step 4: Commit**

```bash
git add src/player/App.test.ts
git commit -m "test: full-frame smoke — all labels present, no cross junctions, width-safe"
```

---

## Self-Review (to be completed after plan is written)

Applied at the end of writing:

**Spec coverage** — every spec section has at least one task:
- §2 design language — enforced via widget tests (panel labels, glyph vocab)
- §3 wireframe — Tasks 6, 11, 14 materialize the geometry & chrome
- §4 layout geometry — Task 6
- §5.1 screen panel — Task 11
- §5.2 now panel — Task 14
- §5.3 pads — Tasks 9 (fingerprint) + 10 (widget) + 17 (keybinds)
- §5.4 lyrics big-type — Tasks 7 (half-block) + 8 (bigLyric) + 15 (lyrics widget)
- §5.5 spectrum — Task 12
- §5.6 progress waveform — Task 13
- §5.7 LED chaser — Task 13
- §5.8 titleBar — Task 16
- §6.1 data inputs — no new feeders needed; existing state fields consumed by widgets
- §6.2 accent arbiter — Task 5
- §6.3 peak-hold — Task 4
- §6.4 brightness variants — Task 2
- §7 state changes — Task 1
- §7 AsciiArt padFingerprint — Task 9
- §8 testing order — Tasks 1-16 follow the order in the spec
- §9 migration — Task 17 (delete recentlyPlayed, wire App)
- §10 scope — audio-features stays out; fudged DNA lives in Task 3
- §11 risks — MIN_ROWS=28 enforced in Task 6 test

**Placeholders** — none: every step has concrete code or a concrete command.

**Type consistency** — `computeDna` returns `TrackDna` everywhere; `resolveAccentTargets` returns `Set<AccentTarget>` consumed by `renderSpectrum` / `renderLyrics` / `renderTitleBar`; `renderBigLyric` props shape matches between Tasks 8 & 15; region field names match layout fields (`screenR/nowR/padsR/lyricsR/spectrumR/scrubR/keysR`).

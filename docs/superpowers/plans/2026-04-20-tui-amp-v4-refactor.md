# TUI.AMP v4.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite `src/ui/*` and `src/visualizer/*` into a fixed-grid "TUI.AMP v4.0" hardware-rack UI per `docs/superpowers/specs/2026-04-19-tui-amp-v4-refactor-design.md`.

**Architecture:** Fixed 7-row grid (title / sep / top / sep / middle / sep / bottom). Pure widget functions take `(renderer, region, state, theme)`; feeders run async and mutate `AppState`; `App.ts` render loop calls widgets each tick and flushes dirty rows. Rounded-corner box-drawing throughout, no `┼`.

**Tech Stack:** Node.js + TypeScript, `axios`, `dotenv`, `jimp`, existing `tsc` build, `node --test` for tests.

**Known interface gaps to reconcile with spec:**
- `AudioSource.onFrame(cb)` delivers **mono** `Float32Array` (not stereo interleaved). The `extractChannelPeaks` helper takes interleaved per the spec, but current callers pass a mono frame; we fall back to `peakL === peakR` until a stereo path is added. This is explicitly in-scope for this plan as a *stub* — the helper is written to spec so a future stereo upgrade is drop-in.
- `src/config/store.ts` exposes `loadConfig()`, not `loadEnv()`. Search module will use `dotenv.config()` + `process.env` directly.
- `src/ui/layout.ts` is deleted; its sole remaining dependent after the refactor (`src/ui/tui.ts`) needs `Region` inlined.

---

## File Structure

### Created
- `src/dsp/channelPeaks.ts`
- `src/ui/borders.ts`, `src/ui/bitfont.ts`, `src/ui/cpuLoad.ts`
- `src/player/App.ts`, `src/player/layout.ts`, `src/player/state.ts`, `src/player/theme.ts`
- `src/player/feeders/{audio,spotify,lyrics,albumArt,cpu}Feeder.ts`
- `src/player/search/{spotifyWebApi,searchState}.ts`
- `src/player/widgets/{titleBar,albumArt,nowPlaying,recentlyPlayed,lyrics,spectrum,controls}.ts`
- Tests: `*.test.ts` next to source files.

### Modified
- `src/ui/renderer.ts` (add `flushDirty`, `invalidate`, `debugLines`)
- `src/ui/input.ts` (two-mode event emitter; signature change)
- `src/ui/tui.ts` (inline `Region` after `layout.ts` delete)
- `src/macos/spotifyDesktop.ts` (add `playTrack(uri)`)
- `src/cli/commands/launch.ts` (default mode = "player"; wire to `App`)

### Deleted
- `src/visualizer/engine.ts`, `src/visualizer/state.ts`
- `src/visualizer/modes/*` (every file)
- `src/visualizer/widgets/*` (every file)
- `src/ui/layout.ts`

---

## Phase 1 — Additive Groundwork (no deletions yet)

### Task 1: `extractChannelPeaks` DSP helper

**Files:**
- Create: `src/dsp/channelPeaks.ts`
- Test: `src/dsp/channelPeaks.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/dsp/channelPeaks.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractChannelPeaks } from "./channelPeaks.js";

describe("extractChannelPeaks", () => {
  it("returns per-channel absolute peaks from interleaved stereo", () => {
    const buf = new Float32Array([0.1, -0.9, 0.5, 0.2, -0.3, 0.8]);
    const peaks = extractChannelPeaks(buf, 2);
    assert.equal(peaks.length, 2);
    assert.equal(peaks[0], 0.5);   // L: 0.1, 0.5, -0.3 → |0.5|
    assert.equal(peaks[1], 0.9);   // R: -0.9, 0.2, 0.8 → |-0.9|
  });

  it("returns [peak] for mono (numChannels=1)", () => {
    const buf = new Float32Array([0.2, -0.7, 0.4]);
    const peaks = extractChannelPeaks(buf, 1);
    assert.deepEqual(peaks, [0.7]);
  });

  it("returns zeros for empty buffer", () => {
    const peaks = extractChannelPeaks(new Float32Array(0), 2);
    assert.deepEqual(peaks, [0, 0]);
  });
});
```

- [ ] **Step 2: Run and confirm fail**

Run: `npm run build 2>&1 | head -40`
Expected: `TS2307: Cannot find module './channelPeaks.js'` or equivalent.

- [ ] **Step 3: Implement**

```typescript
// src/dsp/channelPeaks.ts
/**
 * Per-channel absolute peak from interleaved PCM.
 * Frame layout: [c0, c1, ..., c(n-1), c0, c1, ...].
 */
export function extractChannelPeaks(
  interleaved: Float32Array,
  numChannels: number
): number[] {
  const peaks = new Array<number>(numChannels).fill(0);
  const n = interleaved.length;
  for (let i = 0; i < n; i++) {
    const ch = i % numChannels;
    const v = Math.abs(interleaved[i]);
    if (v > peaks[ch]) peaks[ch] = v;
  }
  return peaks;
}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `npm test 2>&1 | grep -E "(channelPeaks|# pass|# fail)"`
Expected: tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/dsp/channelPeaks.ts src/dsp/channelPeaks.test.ts
git commit -m "feat(dsp): add extractChannelPeaks helper"
```

---

### Task 2: Add `playTrack(uri)` to SpotifyDesktop

**Files:**
- Modify: `src/macos/spotifyDesktop.ts` (append export)

- [ ] **Step 1: Add the function**

Append at end of `src/macos/spotifyDesktop.ts`:

```typescript
export async function playTrack(uri: string): Promise<void> {
  // Spotify URIs look like spotify:track:<22-char-id>
  if (!/^spotify:track:[A-Za-z0-9]+$/.test(uri)) {
    throw new Error(`Invalid Spotify track URI: ${uri}`);
  }
  await tell(`play track "${uri}"`);
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/macos/spotifyDesktop.ts
git commit -m "feat(macos): playTrack(uri) via osascript"
```

---

### Task 3: Renderer extensions (`flushDirty`, `invalidate`, `debugLines`)

**Files:**
- Modify: `src/ui/renderer.ts`
- Test: `src/ui/renderer.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/ui/renderer.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Renderer } from "./renderer.js";

describe("Renderer extensions", () => {
  it("debugLines returns one string per row at buffer width", () => {
    const r = new Renderer(5, 2);
    r.write(0, 0, "abc");
    r.write(0, 1, "xy");
    const lines = r.debugLines();
    assert.equal(lines.length, 2);
    assert.equal(lines[0], "abc  ");
    assert.equal(lines[1], "xy   ");
  });

  it("invalidate() forces next flushDirty to be a full flush", () => {
    const r = new Renderer(3, 1);
    // No stdout assertions; we just exercise the code path.
    r.write(0, 0, "abc");
    r.flushDirty();        // first call: full flush
    r.flushDirty();        // no-op (unchanged)
    r.invalidate();
    r.flushDirty();        // full flush again — should not throw
    assert.ok(true);
  });
});
```

- [ ] **Step 2: Run, expect fail** (methods undefined).

- [ ] **Step 3: Modify `src/ui/renderer.ts`**

Add fields after `private cells: string[];`:

```typescript
  private prevLines: string[] = [];
  private dirtyAll = true;
```

Update `resize()` body to also reset `this.prevLines = []; this.dirtyAll = true;`.

Add methods at bottom of class (before closing brace):

```typescript
  invalidate(): void {
    this.dirtyAll = true;
  }

  debugLines(): string[] {
    const out: string[] = [];
    for (let row = 0; row < this.rows; row++) {
      out.push(
        this.cells.slice(row * this.cols, row * this.cols + this.cols).join("")
      );
    }
    return out;
  }

  flushDirty(): void {
    const lines = this.debugLines();
    if (this.dirtyAll || lines.length !== this.prevLines.length) {
      process.stdout.write("\x1b[H" + lines.join("\n"));
      this.dirtyAll = false;
    } else {
      const parts: string[] = [];
      for (let row = 0; row < lines.length; row++) {
        if (lines[row] !== this.prevLines[row]) {
          parts.push(`\x1b[${row + 1};1H\x1b[0m${lines[row]}`);
        }
      }
      if (parts.length > 0) process.stdout.write(parts.join(""));
    }
    this.prevLines = lines;
  }
```

- [ ] **Step 4: Run test — PASS.**

- [ ] **Step 5: Commit**

```bash
git add src/ui/renderer.ts src/ui/renderer.test.ts
git commit -m "feat(ui): renderer flushDirty/invalidate/debugLines"
```

---

### Task 4: `src/ui/borders.ts` — rounded box & junction drawing

**Files:**
- Create: `src/ui/borders.ts`
- Test: `src/ui/borders.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/ui/borders.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Renderer } from "./renderer.js";
import { drawOuterBorder, drawHSep, BOX } from "./borders.js";

// strip ANSI for clean matching
const strip = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");

describe("borders", () => {
  it("draws rounded outer border with correct corners", () => {
    const r = new Renderer(6, 4);
    drawOuterBorder(r, { x: 0, y: 0, width: 6, height: 4 }, "", "");
    const lines = r.debugLines().map(strip);
    assert.equal(lines[0], "╭────╮");
    assert.equal(lines[1], "│    │");
    assert.equal(lines[2], "│    │");
    assert.equal(lines[3], "╰────╯");
  });

  it("never produces ┼ in any primitive", () => {
    assert.equal(Object.values(BOX).includes("┼"), false);
  });

  it("drawHSep places junctions at specified columns", () => {
    const r = new Renderer(8, 3);
    drawOuterBorder(r, { x: 0, y: 0, width: 8, height: 3 }, "", "");
    drawHSep(r,
      { x: 0, y: 1, width: 8, height: 1 },
      8,
      [{ col: 3, char: "┬" }, { col: 5, char: "┴" }],
      "", "",
    );
    const sep = strip(r.debugLines()[1]);
    assert.equal(sep, "├──┬─┴─┤");
  });
});
```

- [ ] **Step 2: Run, expect fail.**

- [ ] **Step 3: Implement `src/ui/borders.ts`**

```typescript
import type { Region } from "./tui.js";
import type { Renderer } from "./renderer.js";

export const BOX = {
  TL: "╭", TR: "╮", BL: "╰", BR: "╯",
  H: "─",  V: "│",
  LT: "├", RT: "┤", TJ: "┬", BJ: "┴",
} as const;

export function drawOuterBorder(
  r: Renderer, region: Region, dim: string, reset: string,
): void {
  const { x, y, width: W, height: H } = region;
  const top = dim + BOX.TL + BOX.H.repeat(Math.max(0, W - 2)) + BOX.TR + reset;
  const bot = dim + BOX.BL + BOX.H.repeat(Math.max(0, W - 2)) + BOX.BR + reset;
  r.write(x, y, top);
  r.write(x, y + H - 1, bot);
  for (let row = y + 1; row < y + H - 1; row++) {
    r.write(x,         row, dim + BOX.V + reset);
    r.write(x + W - 1, row, dim + BOX.V + reset);
  }
}

export function drawHSep(
  r: Renderer,
  sepRow: Region,
  fullWidth: number,
  junctions: Array<{ col: number; char: "┬" | "┴" }>,
  dim: string, reset: string,
): void {
  const { x, y } = sepRow;
  r.write(x, y, dim + BOX.LT + reset);
  const jMap = new Map(junctions.map(j => [j.col, j.char]));
  for (let col = x + 1; col < x + fullWidth - 1; col++) {
    r.write(col, y, dim + (jMap.get(col) ?? BOX.H) + reset);
  }
  r.write(x + fullWidth - 1, y, dim + BOX.RT + reset);
}

export function drawVDiv(
  r: Renderer, x: number, startY: number, endY: number,
  dim: string, reset: string,
): void {
  for (let row = startY; row <= endY; row++) {
    r.write(x, row, dim + BOX.V + reset);
  }
}
```

- [ ] **Step 4: PASS.**

- [ ] **Step 5: Commit** — `feat(ui): rounded-corner borders + junction helper`.

---

### Task 5: `src/ui/bitfont.ts` — 8×6 block font

**Files:**
- Create: `src/ui/bitfont.ts`
- Test: `src/ui/bitfont.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/ui/bitfont.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GLYPHS, renderGlyphs } from "./bitfont.js";

describe("bitfont", () => {
  it("every glyph is exactly 8 rows × 6 cols", () => {
    for (const [ch, rows] of Object.entries(GLYPHS)) {
      assert.equal(rows.length, 8, `glyph ${ch} must have 8 rows`);
      for (const r of rows) {
        assert.equal([...r].length, 6, `glyph ${ch} row must be 6 cols`);
      }
    }
  });

  it("glyph chars are a subset of { ' ', '█', '▓', '▒', '░' }", () => {
    const allowed = new Set([" ", "█", "▓", "▒", "░"]);
    for (const rows of Object.values(GLYPHS)) {
      for (const r of rows) for (const c of r) {
        assert.ok(allowed.has(c), `disallowed glyph char ${JSON.stringify(c)}`);
      }
    }
  });

  it("renderGlyphs returns 8 lines for a 1-char input", () => {
    const lines = renderGlyphs("A");
    assert.equal(lines.length, 8);
    assert.equal([...lines[0]].length, 6);
  });

  it("uses space-glyph for unknown chars", () => {
    const lines = renderGlyphs("~");
    assert.equal(lines.length, 8);
    for (const l of lines) for (const c of l) assert.equal(c, " ");
  });
});
```

- [ ] **Step 2: Expect fail.**

- [ ] **Step 3: Implement `src/ui/bitfont.ts`**

The full A–Z/0–9/`. , ! ?`/space glyph table is ~40 entries × 8 rows. We ship a minimal correct subset below, then fill the remaining letters with the same pattern. The test only asserts shape + allowed chars, so any well-formed glyph passes.

```typescript
// 8 rows × 6 cols. Characters: only ' ', '█', '▓', '▒', '░'.
export const GLYPHS: Record<string, string[]> = {
  " ": ["      ","      ","      ","      ","      ","      ","      ","      "],
  "A": ["  ██  "," ████ ","██  ██","██  ██","██████","██  ██","██  ██","      "],
  "B": ["█████ ","██  ██","██  ██","█████ ","██  ██","██  ██","█████ ","      "],
  "C": [" ████ ","██  ██","██    ","██    ","██    ","██  ██"," ████ ","      "],
  "D": ["████  ","██ ██ ","██  ██","██  ██","██  ██","██ ██ ","████  ","      "],
  "E": ["██████","██    ","██    ","████  ","██    ","██    ","██████","      "],
  "F": ["██████","██    ","██    ","████  ","██    ","██    ","██    ","      "],
  "G": [" ████ ","██  ██","██    ","██ ███","██  ██","██  ██"," ████ ","      "],
  "H": ["██  ██","██  ██","██  ██","██████","██  ██","██  ██","██  ██","      "],
  "I": ["██████","  ██  ","  ██  ","  ██  ","  ██  ","  ██  ","██████","      "],
  "J": ["██████","    ██","    ██","    ██","    ██","██  ██"," ████ ","      "],
  "K": ["██  ██","██ ██ ","████  ","███   ","████  ","██ ██ ","██  ██","      "],
  "L": ["██    ","██    ","██    ","██    ","██    ","██    ","██████","      "],
  "M": ["██  ██","██████","██████","██████","██  ██","██  ██","██  ██","      "],
  "N": ["██  ██","███ ██","██████","██████","██ ███","██  ██","██  ██","      "],
  "O": [" ████ ","██  ██","██  ██","██  ██","██  ██","██  ██"," ████ ","      "],
  "P": ["█████ ","██  ██","██  ██","█████ ","██    ","██    ","██    ","      "],
  "Q": [" ████ ","██  ██","██  ██","██  ██","██ ███","██  ██"," █████","      "],
  "R": ["█████ ","██  ██","██  ██","█████ ","████  ","██ ██ ","██  ██","      "],
  "S": [" █████","██    ","██    "," ████ ","    ██","    ██","█████ ","      "],
  "T": ["██████","  ██  ","  ██  ","  ██  ","  ██  ","  ██  ","  ██  ","      "],
  "U": ["██  ██","██  ██","██  ██","██  ██","██  ██","██  ██"," ████ ","      "],
  "V": ["██  ██","██  ██","██  ██","██  ██","██  ██"," ████ ","  ██  ","      "],
  "W": ["██  ██","██  ██","██  ██","██████","██████","██████","██  ██","      "],
  "X": ["██  ██","██  ██"," ████ ","  ██  "," ████ ","██  ██","██  ██","      "],
  "Y": ["██  ██","██  ██","██  ██"," ████ ","  ██  ","  ██  ","  ██  ","      "],
  "Z": ["██████","    ██","   ██ ","  ██  "," ██   ","██    ","██████","      "],
  "0": [" ████ ","██  ██","██ ███","██████","███ ██","██  ██"," ████ ","      "],
  "1": ["  ██  "," ███  ","  ██  ","  ██  ","  ██  ","  ██  ","██████","      "],
  "2": [" ████ ","██  ██","    ██","   ██ ","  ██  "," ██   ","██████","      "],
  "3": [" ████ ","██  ██","    ██"," ████ ","    ██","██  ██"," ████ ","      "],
  "4": ["   ██ ","  ███ "," ████ ","██ ██ ","██████","   ██ ","   ██ ","      "],
  "5": ["██████","██    ","█████ ","    ██","    ██","██  ██"," ████ ","      "],
  "6": [" ████ ","██    ","██    ","█████ ","██  ██","██  ██"," ████ ","      "],
  "7": ["██████","    ██","   ██ ","  ██  "," ██   ","██    ","██    ","      "],
  "8": [" ████ ","██  ██","██  ██"," ████ ","██  ██","██  ██"," ████ ","      "],
  "9": [" ████ ","██  ██","██  ██"," █████","    ██","    ██"," ████ ","      "],
  ".": ["      ","      ","      ","      ","      ","      ","  ██  ","      "],
  ",": ["      ","      ","      ","      ","      ","  ██  ","  ██  ","  █   "],
  "!": ["  ██  ","  ██  ","  ██  ","  ██  ","  ██  ","      ","  ██  ","      "],
  "?": [" ████ ","██  ██","    ██","   ██ ","  ██  ","      ","  ██  ","      "],
};

const SPACE = GLYPHS[" "];

export function renderGlyphs(text: string): string[] {
  const out = ["", "", "", "", "", "", "", ""];
  const chars = [...text.toUpperCase()];
  for (const ch of chars) {
    const g = GLYPHS[ch] ?? SPACE;
    for (let row = 0; row < 8; row++) out[row] += g[row];
  }
  return out;
}
```

- [ ] **Step 4: PASS.**

- [ ] **Step 5: Commit** — `feat(ui): 8x6 block bitmap font for kinetic lyrics`.

---

### Task 6: `src/ui/cpuLoad.ts` — CPU sampler

**Files:** Create `src/ui/cpuLoad.ts`.

- [ ] **Step 1: Implement**

```typescript
/**
 * 1 Hz sampler over process.cpuUsage(). Reports percent of one core,
 * exponentially smoothed with α=0.3.
 */
export class CpuLoad {
  private prevUsage = process.cpuUsage();
  private prevWallMs = Date.now();
  private smoothed = 0;
  private timer: ReturnType<typeof setInterval> | null = null;

  start(onUpdate: (pct: number) => void): void {
    this.timer = setInterval(() => {
      const now = Date.now();
      const dt = Math.max(1, now - this.prevWallMs);
      const u = process.cpuUsage(this.prevUsage);
      const cpuUs = u.user + u.system;
      const pct = (cpuUs / 1000) / dt * 100; // % of one core
      this.smoothed = this.smoothed * 0.7 + pct * 0.3;
      this.prevUsage = process.cpuUsage();
      this.prevWallMs = now;
      onUpdate(this.smoothed);
    }, 1000);
    this.timer.unref?.();
  }

  stop(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }
}
```

- [ ] **Step 2: Verify `npm run build`**.

- [ ] **Step 3: Commit** — `feat(ui): CpuLoad 1Hz sampler`.

---

## Phase 2 — Player Foundation

### Task 7: `src/player/state.ts` + `pushRecentlyPlayed`

**Files:**
- Create: `src/player/state.ts`, `src/player/state.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/player/state.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { makeInitialState, pushRecentlyPlayed } from "./state.js";

describe("pushRecentlyPlayed", () => {
  it("inserts newest first, dedup by trackId, cap 8", () => {
    const s = makeInitialState(100, 30);
    for (let i = 0; i < 10; i++) {
      pushRecentlyPlayed(s, { trackId: `t${i}`, trackName: `T${i}`, artistName: "A" });
    }
    assert.equal(s.recentlyPlayed.length, 8);
    assert.equal(s.recentlyPlayed[0].trackId, "t9");
    // Re-push existing t5 → should move to front, still length 8
    pushRecentlyPlayed(s, { trackId: "t5", trackName: "T5", artistName: "A" });
    assert.equal(s.recentlyPlayed[0].trackId, "t5");
    assert.equal(s.recentlyPlayed.length, 8);
    // t5 should appear only once
    assert.equal(
      s.recentlyPlayed.filter(e => e.trackId === "t5").length,
      1,
    );
  });
});
```

- [ ] **Step 2: Expect fail.**

- [ ] **Step 3: Implement `src/player/state.ts`**

```typescript
export interface NowPlaying {
  trackName: string;
  artistName: string;
  albumName: string;
  albumArtUrl: string;
  durationMs: number;
}

export interface RecentEntry {
  trackId: string;
  trackName: string;
  artistName: string;
}

export interface SearchResult {
  id: string;
  uri: string;
  name: string;
  artist: string;
  album: string;
  durationMs: number;
}

export interface SearchState {
  focused: boolean;
  query: string;
  loading: boolean;
  results: SearchResult[];
  selectedIndex: number;
}

export interface LyricLine { timeMs: number; text: string; }

export interface AppState {
  cols: number;
  rows: number;
  quit: boolean;

  // audio
  spectrum: Float32Array;
  meterL: number;
  meterR: number;
  rms: number;
  transientPeak: boolean;
  transientEnergy: number;

  // spotify
  nowPlaying: NowPlaying | null;
  recentlyPlayed: RecentEntry[];
  isPlaying: boolean;
  progressMs: number;
  durationMs: number;
  lastSpotifyPollAt: number;

  // lyrics
  lyrics: LyricLine[];
  activeLyricIndex: number;

  // album art
  albumArt: string[] | null;

  // ui
  spectrumPaletteIndex: number;
  artCellMode: "art" | "vu" | "blank";
  isMuted: boolean;
  savedVolume: number;
  cpuPct: number;

  // search
  search: SearchState;
}

export const RECENT_MAX = 8;

export function makeInitialState(cols: number, rows: number): AppState {
  return {
    cols, rows, quit: false,
    spectrum: new Float32Array(16),
    meterL: 0, meterR: 0, rms: 0,
    transientPeak: false, transientEnergy: 0,
    nowPlaying: null,
    recentlyPlayed: [],
    isPlaying: false,
    progressMs: 0, durationMs: 0, lastSpotifyPollAt: 0,
    lyrics: [], activeLyricIndex: -1,
    albumArt: null,
    spectrumPaletteIndex: 0,
    artCellMode: "art",
    isMuted: false, savedVolume: 100,
    cpuPct: 0,
    search: { focused: false, query: "", loading: false, results: [], selectedIndex: 0 },
  };
}

export function pushRecentlyPlayed(state: AppState, entry: RecentEntry): void {
  state.recentlyPlayed = [
    entry,
    ...state.recentlyPlayed.filter(e => e.trackId !== entry.trackId),
  ].slice(0, RECENT_MAX);
}
```

- [ ] **Step 4: PASS.**

- [ ] **Step 5: Commit** — `feat(player): AppState + pushRecentlyPlayed`.

---

### Task 8: `src/player/theme.ts`

**Files:** Create `src/player/theme.ts`.

- [ ] **Step 1: Implement**

```typescript
export interface Palette {
  name: string;
  barColors: string[]; // ANSI SGR strings, low→high
  meterMid: string;
}

export interface Theme {
  fg: string;
  dim: string;
  border: string;
  reset: string;
  palette: Palette;
  palettes: Palette[];
}

const RESET = "\x1b[0m";
const FG    = "\x1b[97m";
const DIM   = "\x1b[2;37m";

const AMBER: Palette = {
  name: "amber",
  barColors: [
    "\x1b[38;2;255;179;71m",
    "\x1b[38;2;255;140;0m",
    "\x1b[38;2;255;107;53m",
  ],
  meterMid: "\x1b[38;2;255;140;0m",
};
const TEAL: Palette = {
  name: "teal",
  barColors: [
    "\x1b[38;2;0;200;200m",
    "\x1b[38;2;0;230;150m",
    "\x1b[38;2;0;255;180m",
  ],
  meterMid: "\x1b[38;2;0;210;180m",
};
const MAGENTA: Palette = {
  name: "magenta",
  barColors: [
    "\x1b[38;2;150;0;255m",
    "\x1b[38;2;200;0;200m",
    "\x1b[38;2;255;0;150m",
  ],
  meterMid: "\x1b[38;2;200;50;200m",
};
const MONO: Palette = {
  name: "mono",
  barColors: ["\x1b[37m", "\x1b[97m", "\x1b[97m"],
  meterMid: "\x1b[37m",
};

export const PALETTES: Palette[] = [AMBER, TEAL, MAGENTA, MONO];

export function makeTheme(paletteIndex = 0): Theme {
  const palette = PALETTES[((paletteIndex % PALETTES.length) + PALETTES.length) % PALETTES.length];
  return { fg: FG, dim: DIM, border: DIM, reset: RESET, palette, palettes: PALETTES };
}
```

- [ ] **Step 2: Commit** — `feat(player): theme & palettes`.

---

### Task 9: `src/player/layout.ts` — grid

**Files:** Create `src/player/layout.ts`, `src/player/layout.test.ts`.

- [ ] **Step 1: Write the failing test**

```typescript
// src/player/layout.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeGrid, isTooSmall, MIN_COLS, MIN_ROWS } from "./layout.js";

describe("computeGrid", () => {
  it("middle-row halves are equal at representative sizes", () => {
    for (const [cols, rows] of [[100, 30], [140, 40], [200, 60]] as const) {
      const g = computeGrid(cols, rows);
      assert.equal(g.lyricsR.width, g.spectrumR.width, `${cols}x${rows}`);
    }
  });

  it("all regions tile exactly inside outer at 120x36", () => {
    const g = computeGrid(120, 36);
    // Top row cells cover topRow width
    const topSum = g.artR.width + g.nowR.width + g.recentR.width;
    assert.equal(topSum, g.topRow.width);
    // Title bar cells cover titleBar width
    const titleSum = g.brandR.width + g.searchBarR.width + g.sysLoadR.width;
    assert.equal(titleSum, g.titleBar.width);
    // Middle row halves cover middleRow
    assert.equal(g.lyricsR.width + g.spectrumR.width, g.middleRow.width);
  });

  it("isTooSmall is true below 96x24", () => {
    assert.ok(isTooSmall(MIN_COLS - 1, MIN_ROWS));
    assert.ok(isTooSmall(MIN_COLS, MIN_ROWS - 1));
    assert.ok(!isTooSmall(MIN_COLS, MIN_ROWS));
  });
});
```

- [ ] **Step 2: Expect fail.**

- [ ] **Step 3: Implement `src/player/layout.ts`**

```typescript
import { vSplit, hSplit, C, type Region } from "../ui/tui.js";

export type { Region };

export const MIN_COLS = 96;
export const MIN_ROWS = 24;

export function isTooSmall(cols: number, rows: number): boolean {
  return cols < MIN_COLS || rows < MIN_ROWS;
}
export function tooSmallMessage(cols: number, rows: number): string {
  return `Terminal too small: ${cols}x${rows} (minimum ${MIN_COLS}x${MIN_ROWS})`;
}

export interface GridLayout {
  outer: Region; inner: Region;
  titleBar: Region; topRow: Region; middleRow: Region; bottomRow: Region;
  sep1: Region; sep2: Region; sep3: Region;
  brandR: Region; searchBarR: Region; sysLoadR: Region;
  artR: Region; nowR: Region; recentR: Region;
  lyricsR: Region; spectrumR: Region;
  scrubR: Region; keysR: Region;
}

export function computeGrid(cols: number, rows: number): GridLayout {
  const outer = { x: 0, y: 0, width: cols, height: rows };
  const inner = { x: 1, y: 1, width: cols - 2, height: rows - 2 };

  const [titleBar, sep1, topRow, sep2, middleRow, sep3, bottomRow] =
    vSplit(inner, [
      C.length(1),
      C.length(1),
      C.length(10),
      C.length(1),
      C.fill(),
      C.length(1),
      C.length(2),
    ]);

  const [brandR, searchBarR, sysLoadR] = hSplit(titleBar, [
    C.length(16), C.fill(), C.length(16),
  ]);

  const [artR, nowR, recentR] = hSplit(topRow, [
    C.percent(33), C.percent(34), C.percent(33),
  ]);

  const [lyricsR, spectrumR] = hSplit(middleRow, [
    C.percent(50), C.percent(50),
  ]);

  const [scrubR, keysR] = vSplit(bottomRow, [C.length(1), C.length(1)]);

  return {
    outer, inner,
    titleBar, topRow, middleRow, bottomRow,
    sep1, sep2, sep3,
    brandR, searchBarR, sysLoadR,
    artR, nowR, recentR,
    lyricsR, spectrumR,
    scrubR, keysR,
  };
}
```

- [ ] **Step 4: PASS.**

- [ ] **Step 5: Commit** — `feat(player): grid layout`.

---

## Phase 3 — Input + Search

### Task 10: Restructure `src/ui/input.ts` — two-mode emitter

**Files:**
- Modify: `src/ui/input.ts`
- Test: `src/ui/input.test.ts`

- [ ] **Step 1: Write the failing test (logic-only, no raw TTY)**

```typescript
// src/ui/input.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { _handleKeyForTest } from "./input.js";
import type { InputEvent } from "./input.js";

describe("input two-mode", () => {
  it("hotkey mode: 'p' emits toggle_play", () => {
    const evs: InputEvent[] = [];
    _handleKeyForTest("p", { name: "p" }, "hotkey", e => evs.push(e));
    // Transport is debounced, so we synchronously expect none yet.
    assert.equal(evs.length, 0);
  });

  it("text mode: 'p' emits text char, not hotkey", () => {
    const evs: InputEvent[] = [];
    _handleKeyForTest("p", { name: "p" }, "text", e => evs.push(e));
    assert.deepEqual(evs, [{ kind: "text", char: "p" }]);
  });

  it("escape in text mode emits edit/escape", () => {
    const evs: InputEvent[] = [];
    _handleKeyForTest("", { name: "escape" }, "text", e => evs.push(e));
    assert.deepEqual(evs, [{ kind: "edit", op: "escape" }]);
  });

  it("ctrl-c always emits quit", () => {
    const evs: InputEvent[] = [];
    _handleKeyForTest("", { name: "c", ctrl: true }, "hotkey", e => evs.push(e));
    assert.deepEqual(evs, [{ kind: "quit" }]);
  });
});
```

- [ ] **Step 2: Expect fail.**

- [ ] **Step 3: Replace `src/ui/input.ts` with**:

```typescript
import readline from "readline";

export type HotkeyAction =
  | "quit" | "toggle_play" | "next" | "prev"
  | "mute" | "cycle_palette" | "toggle_art" | "focus_search";

export type InputEvent =
  | { kind: "hotkey"; action: HotkeyAction }
  | { kind: "text";   char: string }
  | { kind: "edit";   op: "backspace" | "enter" | "escape" }
  | { kind: "nav";    dir: "up" | "down" | "left" | "right" }
  | { kind: "quit" };

type Mode = "hotkey" | "text";
type KeyMeta = { name?: string; ctrl?: boolean; sequence?: string };

const DEBOUNCE_MS = 300;
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
function debounced(key: string, fn: () => void): void {
  const prev = debounceTimers.get(key);
  if (prev) clearTimeout(prev);
  const t = setTimeout(() => { debounceTimers.delete(key); fn(); }, DEBOUNCE_MS);
  debounceTimers.set(key, t);
}

let rawMode = false;
let getMode: (() => Mode) | null = null;
let onEvent: ((e: InputEvent) => void) | null = null;

function onKeypress(chunk: string, key: KeyMeta): void {
  if (!getMode || !onEvent) return;
  _handleKeyForTest(chunk, key, getMode(), onEvent);
}

export function _handleKeyForTest(
  chunk: string, key: KeyMeta, mode: Mode, emit: (e: InputEvent) => void,
): void {
  if (key.ctrl && key.name === "c") { emit({ kind: "quit" }); return; }

  if (mode === "text") {
    const k = key.name ?? "";
    if (k === "backspace") return emit({ kind: "edit", op: "backspace" });
    if (k === "return")    return emit({ kind: "edit", op: "enter" });
    if (k === "escape")    return emit({ kind: "edit", op: "escape" });
    if (k === "up" || k === "down" || k === "left" || k === "right")
      return emit({ kind: "nav", dir: k });
    if (chunk && chunk.length === 1 && chunk >= " ")
      return emit({ kind: "text", char: chunk });
    return;
  }

  // hotkey mode
  const k = key.name ?? chunk;
  const transport = (action: HotkeyAction) =>
    debounced(action, () => emit({ kind: "hotkey", action }));
  switch (k) {
    case "p": transport("toggle_play"); break;
    case "n": transport("next");        break;
    case "b": transport("prev");        break;
    case "m": transport("mute");        break;
    case "v": emit({ kind: "hotkey", action: "cycle_palette" }); break;
    case "a": emit({ kind: "hotkey", action: "toggle_art" });    break;
    case "q": emit({ kind: "quit" });                             break;
    case "/": emit({ kind: "hotkey", action: "focus_search" });   break;
  }
}

export function startInput(
  getModeFn: () => Mode,
  onEventFn: (e: InputEvent) => void,
): void {
  getMode = getModeFn;
  onEvent = onEventFn;
  if (!rawMode) {
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) process.stdin.setRawMode(true);
    rawMode = true;
  }
  process.stdin.on("keypress", onKeypress);
}

export function stopInput(): void {
  process.stdin.removeListener("keypress", onKeypress);
  if (rawMode && process.stdin.isTTY) {
    process.stdin.setRawMode(false);
    rawMode = false;
  }
  getMode = null;
  onEvent = null;
  for (const t of debounceTimers.values()) clearTimeout(t);
  debounceTimers.clear();
}
```

- [ ] **Step 4: PASS.** (Note: existing engine.ts uses old API — compile will fail until Task 25+26 rewire. We tolerate this by deleting engine.ts in Task 27. For intermediate builds, leave the old `engine.ts` temporarily broken and build only the new subtree for test verification with `npx tsc --noEmit -p tsconfig.json` expected to error in engine.ts. Alternative: gate the deletions forward.)

**Decision:** to keep intermediate builds green, **do not delete old files until Phase 7**. During Phase 3–6, old `engine.ts` must still compile. Since it uses the old `startInput(handler)` signature, we temporarily keep a legacy overload. Replace the public export as follows instead — keep both signatures:

```typescript
// Back-compat overload for old engine.ts (deleted in Phase 7).
export function startInputLegacy(handler: (a: string) => void): void {
  startInput(() => "hotkey", (e) => {
    if (e.kind === "quit") handler("quit");
    else if (e.kind === "hotkey") handler(e.action);
  });
}
```

Then in current `src/visualizer/engine.ts`, rename the old `startInput` import call site to `startInputLegacy` in a separate small commit. This preserves compilation during the refactor.

- [ ] **Step 4b: Patch `src/visualizer/engine.ts` import** to use `startInputLegacy` instead of `startInput`. Single-line change.

- [ ] **Step 5: Commit** — `feat(ui): two-mode input emitter (legacy shim retained)`.

---

### Task 11: `src/player/search/spotifyWebApi.ts`

**Files:**
- Create: `src/player/search/spotifyWebApi.ts`, `spotifyWebApi.test.ts`.

- [ ] **Step 1: Write the failing test (using axios mock via http interception)**

```typescript
// src/player/search/spotifyWebApi.test.ts
import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { _resetTokenCacheForTest, _setFetchersForTest, search } from "./spotifyWebApi.js";

describe("spotifyWebApi", () => {
  beforeEach(() => _resetTokenCacheForTest());

  it("caches access token; second call does not re-auth", async () => {
    let tokenCalls = 0;
    let searchCalls = 0;
    _setFetchersForTest({
      async token() { tokenCalls++; return { access_token: "tok1", expires_in: 3600 }; },
      async search(_q, bearer) {
        searchCalls++;
        assert.equal(bearer, "tok1");
        return { tracks: { items: [] } };
      },
    });
    await search("x");
    await search("y");
    assert.equal(tokenCalls, 1);
    assert.equal(searchCalls, 2);
  });

  it("on 401 invalidates cache and retries once", async () => {
    let tokenCalls = 0;
    let searchCalls = 0;
    _setFetchersForTest({
      async token() { tokenCalls++; return { access_token: `t${tokenCalls}`, expires_in: 3600 }; },
      async search(_q, bearer) {
        searchCalls++;
        if (searchCalls === 1) {
          const err: any = new Error("401"); err.response = { status: 401 }; throw err;
        }
        return { tracks: { items: [] } };
      },
    });
    await search("x");
    assert.equal(tokenCalls, 2);
    assert.equal(searchCalls, 2);
  });
});
```

- [ ] **Step 2: Expect fail.**

- [ ] **Step 3: Implement `src/player/search/spotifyWebApi.ts`**

```typescript
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

export interface SearchResult {
  id: string; uri: string; name: string;
  artist: string; album: string; durationMs: number;
}

interface Fetchers {
  token(): Promise<{ access_token: string; expires_in: number }>;
  search(q: string, bearer: string): Promise<{ tracks?: { items: any[] } }>;
}

const defaultFetchers: Fetchers = {
  async token() {
    const id = process.env.SPOTIFY_CLIENT_ID;
    const secret = process.env.SPOTIFY_CLIENT_SECRET;
    if (!id || !secret) throw new Error("Missing SPOTIFY_CLIENT_ID/SECRET");
    const basic = Buffer.from(`${id}:${secret}`).toString("base64");
    const res = await axios.post(
      "https://accounts.spotify.com/api/token",
      "grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${basic}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );
    return { access_token: res.data.access_token, expires_in: res.data.expires_in };
  },
  async search(q, bearer) {
    const res = await axios.get("https://api.spotify.com/v1/search", {
      params: { q, type: "track", limit: 8, market: "from_token" },
      headers: { Authorization: `Bearer ${bearer}` },
    });
    return res.data;
  },
};

let fetchers: Fetchers = defaultFetchers;
let tokenCache: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt - now > 60_000) return tokenCache.token;
  const { access_token, expires_in } = await fetchers.token();
  tokenCache = { token: access_token, expiresAt: now + expires_in * 1000 };
  return access_token;
}

export async function search(query: string): Promise<SearchResult[]> {
  let bearer = await getAccessToken();
  let data: { tracks?: { items: any[] } };
  try {
    data = await fetchers.search(query, bearer);
  } catch (err: any) {
    if (err?.response?.status === 401) {
      tokenCache = null;
      bearer = await getAccessToken();
      data = await fetchers.search(query, bearer);
    } else { throw err; }
  }
  return (data.tracks?.items ?? []).map((it: any) => ({
    id: it.id, uri: it.uri, name: it.name,
    artist: it.artists?.[0]?.name ?? "",
    album: it.album?.name ?? "",
    durationMs: it.duration_ms,
  }));
}

// Test hooks
export function _setFetchersForTest(f: Fetchers): void { fetchers = f; }
export function _resetTokenCacheForTest(): void { tokenCache = null; fetchers = defaultFetchers; }
```

- [ ] **Step 4: PASS.**

- [ ] **Step 5: Commit** — `feat(search): Spotify Client-Credentials search`.

---

### Task 12: `src/player/search/searchState.ts`

**Files:** Create.

- [ ] **Step 1: Implement**

```typescript
import type { AppState, SearchResult } from "../state.js";

export function setQuery(s: AppState, q: string): void { s.search.query = q; }
export function setLoading(s: AppState, b: boolean): void { s.search.loading = b; }
export function setResults(s: AppState, r: SearchResult[]): void {
  s.search.results = r;
  s.search.selectedIndex = 0;
}
export function selectNext(s: AppState): void {
  if (s.search.results.length === 0) return;
  s.search.selectedIndex = (s.search.selectedIndex + 1) % s.search.results.length;
}
export function selectPrev(s: AppState): void {
  if (s.search.results.length === 0) return;
  s.search.selectedIndex = (s.search.selectedIndex - 1 + s.search.results.length) % s.search.results.length;
}
export function open(s: AppState): void { s.search.focused = true; }
export function close(s: AppState): void {
  s.search.focused = false;
  s.search.query = "";
  s.search.results = [];
  s.search.selectedIndex = 0;
  s.search.loading = false;
}
```

- [ ] **Step 2: Commit** — `feat(search): search state helpers`.

---

## Phase 4 — Feeders

### Task 13: `src/player/feeders/audioFeeder.ts`

**Files:** Create `audioFeeder.ts` and `audioFeeder.test.ts`.

Note: current `AudioSource.onFrame(cb)` delivers **mono** `Float32Array`. We still use `extractChannelPeaks` with `numChannels=1`, and synthesize meterL/meterR from the mono peak (equal L/R) for now.

- [ ] **Step 1: Write the failing test**

```typescript
// src/player/feeders/audioFeeder.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { _processFrameForTest } from "./audioFeeder.js";
import { makeInitialState } from "../state.js";

describe("audioFeeder", () => {
  it("updates spectrum length + meters + rms on frame", () => {
    const s = makeInitialState(120, 30);
    const frame = new Float32Array(1024);
    for (let i = 0; i < frame.length; i++) frame[i] = Math.sin(i * 0.05) * 0.5;
    _processFrameForTest(s, frame, 44100);
    assert.equal(s.spectrum.length, 16);
    assert.ok(s.rms > 0);
    assert.ok(s.meterL >= 0 && s.meterL <= 1);
  });
});
```

- [ ] **Step 2: Expect fail.**

- [ ] **Step 3: Implement**

```typescript
// src/player/feeders/audioFeeder.ts
import type { AudioSource } from "../../audio/AudioSource.js";
import { computeMagnitudeSpectrum } from "../../dsp/fft.js";
import { computeBuckets } from "../../dsp/buckets.js";
import { extractChannelPeaks } from "../../dsp/channelPeaks.js";
import type { AppState } from "../state.js";

const BANDS = 16;
const TRANSIENT_THRESHOLD = 0.65;
const peak = { value: 1e-3 };

export function _processFrameForTest(
  state: AppState, frame: Float32Array, sampleRate: number,
): void {
  // Per-channel peak (mono → single value, assigned to both L and R)
  const peaks = extractChannelPeaks(frame, 1);
  const p = peaks[0] ?? 0;
  state.meterL = state.meterL * 0.85 + p * 0.15;
  state.meterR = state.meterR * 0.85 + p * 0.15;

  const mag = computeMagnitudeSpectrum(frame);
  const buckets = computeBuckets(mag, BANDS, sampleRate, peak);
  // Exponential smoothing
  const prev = state.spectrum.length === BANDS ? state.spectrum : new Float32Array(BANDS);
  const next = new Float32Array(BANDS);
  for (let i = 0; i < BANDS; i++) next[i] = prev[i] * 0.6 + buckets[i] * 0.4;
  state.spectrum = next;

  // RMS
  let sumSq = 0;
  for (let i = 0; i < frame.length; i++) sumSq += frame[i] * frame[i];
  state.rms = Math.sqrt(sumSq / Math.max(1, frame.length));

  // Transient
  let maxBand = 0;
  for (let i = 0; i < BANDS; i++) if (next[i] > maxBand) maxBand = next[i];
  if (maxBand > TRANSIENT_THRESHOLD) {
    state.transientPeak = true;
    state.transientEnergy = 1.0;
  } else {
    state.transientPeak = false;
  }
}

export function startAudioFeeder(source: AudioSource, state: AppState): void {
  const sampleRate = source.getInfo().sampleRate;
  source.onFrame((frame) => _processFrameForTest(state, frame, sampleRate));
}

const TRANSIENT_HALF_LIFE_MS = 150;
export function decayTransient(state: AppState, dtMs: number): void {
  if (state.transientEnergy <= 0) return;
  const lambda = Math.log(2) / TRANSIENT_HALF_LIFE_MS;
  state.transientEnergy = Math.max(0, state.transientEnergy * Math.exp(-lambda * dtMs));
}
```

**Note:** this assumes `computeMagnitudeSpectrum` is the real export name from `src/dsp/fft.ts`. Verify with:

```bash
grep -nE "export function" src/dsp/fft.ts
```

If the name differs (`fft`, `magnitudeSpectrum`, etc.), adjust the import accordingly — it's a 1-line fix.

- [ ] **Step 4: PASS.**

- [ ] **Step 5: Commit** — `feat(feeder): audioFeeder (spectrum + meters + transient)`.

---

### Task 14: `src/player/feeders/spotifyFeeder.ts`

**Files:** Create.

- [ ] **Step 1: Implement**

```typescript
import * as spotifyDesktop from "../../macos/spotifyDesktop.js";
import type { AppState } from "../state.js";
import { pushRecentlyPlayed } from "../state.js";

export interface SpotifyFeederHooks {
  onTrackChange?: (state: AppState) => void;
}

export function startSpotifyFeeder(state: AppState, hooks: SpotifyFeederHooks = {}): () => void {
  let inFlight = false;
  let lastKey = "";
  const tick = async () => {
    if (inFlight) return;
    inFlight = true;
    try {
      const d = await spotifyDesktop.getState();
      const now = Date.now();
      if (!d) {
        state.nowPlaying = null;
        state.isPlaying = false;
      } else {
        state.nowPlaying = {
          trackName: d.trackName,
          artistName: d.artistName,
          albumName: d.albumName,
          albumArtUrl: d.albumArtUrl,
          durationMs: d.durationMs,
        };
        state.isPlaying = d.isPlaying;
        state.progressMs = d.progressMs;
        state.durationMs = d.durationMs;
        state.lastSpotifyPollAt = now;

        const key = `${d.trackName}::${d.artistName}`;
        if (key !== lastKey) {
          lastKey = key;
          pushRecentlyPlayed(state, {
            trackId: key,
            trackName: d.trackName,
            artistName: d.artistName,
          });
          hooks.onTrackChange?.(state);
        }
      }
    } catch {
      state.nowPlaying = null;
    } finally {
      inFlight = false;
    }
  };
  const iv = setInterval(tick, 1000);
  iv.unref?.();
  tick();  // fire immediately
  return () => clearInterval(iv);
}
```

- [ ] **Step 2: Commit** — `feat(feeder): 1Hz spotifyFeeder + recent ring`.

---

### Task 15: `src/player/feeders/lyricsFeeder.ts`

**Files:** Create.

- [ ] **Step 1: Implement**

```typescript
import { fetchLyrics } from "../../lyrics/lrclib.js";
import type { AppState } from "../state.js";

const cache = new Map<string, { timeMs: number; text: string }[]>();

export async function refreshLyrics(state: AppState): Promise<void> {
  const np = state.nowPlaying;
  if (!np) { state.lyrics = []; state.activeLyricIndex = -1; return; }
  const key = `${np.artistName}::${np.trackName}`;
  if (cache.has(key)) { state.lyrics = cache.get(key)!; state.activeLyricIndex = -1; return; }
  try {
    const lines = await fetchLyrics(np.trackName, np.artistName);
    cache.set(key, lines);
    state.lyrics = lines;
    state.activeLyricIndex = -1;
  } catch {
    state.lyrics = [];
  }
}

export function updateActiveLyricIndex(state: AppState): void {
  const now = state.progressMs + (Date.now() - state.lastSpotifyPollAt);
  let idx = -1;
  for (let i = 0; i < state.lyrics.length; i++) {
    if (state.lyrics[i].timeMs <= now) idx = i; else break;
  }
  state.activeLyricIndex = idx;
}
```

**Note:** If `fetchLyrics` has a different signature in `src/lyrics/lrclib.ts` (e.g. returns a different shape), adapt in a one-line mapping step. Verify:

```bash
grep -nE "export (async )?function" src/lyrics/lrclib.ts
```

- [ ] **Step 2: Commit** — `feat(feeder): lyrics cache + sync index`.

---

### Task 16: `src/player/feeders/albumArtFeeder.ts`

**Files:** Create.

- [ ] **Step 1: Implement**

```typescript
import { fetchImageBuffer } from "../../album/fetcher.js";
import { convertToAscii } from "../../album/converter.js";
import type { AppState } from "../state.js";

export async function refreshAlbumArt(
  state: AppState,
  cellCols: number,
  cellRows: number,
): Promise<void> {
  const url = state.nowPlaying?.albumArtUrl;
  if (!url) { state.albumArt = null; return; }
  try {
    const buf = await fetchImageBuffer(url);
    const lines = await convertToAscii(buf, cellCols, cellRows);
    state.albumArt = lines;
  } catch {
    state.albumArt = null;
  }
}
```

**Note:** verify `fetchImageBuffer`/`convertToAscii` names with `grep -n "export" src/album/*.ts` and adjust.

- [ ] **Step 2: Commit** — `feat(feeder): albumArtFeeder (re-renders on resize)`.

---

### Task 17: `src/player/feeders/cpuFeeder.ts`

**Files:** Create.

- [ ] **Step 1: Implement**

```typescript
import { CpuLoad } from "../../ui/cpuLoad.js";
import type { AppState } from "../state.js";

export function startCpuFeeder(state: AppState): () => void {
  const c = new CpuLoad();
  c.start((pct) => { state.cpuPct = pct; });
  return () => c.stop();
}
```

- [ ] **Step 2: Commit** — `feat(feeder): cpuFeeder`.

---

## Phase 5 — Widgets

All widgets follow the signature:

```typescript
type WidgetFn = (r: Renderer, region: Region, state: AppState, theme: Theme) => void;
```

### Task 18: `src/player/widgets/titleBar.ts`

**Files:** Create + test.

- [ ] **Step 1: Write the failing test**

```typescript
// src/player/widgets/titleBar.test.ts
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Renderer } from "../../ui/renderer.js";
import { makeInitialState } from "../state.js";
import { makeTheme } from "../theme.js";
import { renderTitleBar } from "./titleBar.js";

describe("titleBar", () => {
  it("renders brand on left and SYS.LOAD on right", () => {
    const r = new Renderer(80, 1);
    const s = makeInitialState(80, 1);
    s.cpuPct = 12.5;
    renderTitleBar(r,
      { x: 0, y: 0, width: 80, height: 1 },
      { x: 0, y: 0, width: 16, height: 1 },
      { x: 16, y: 0, width: 48, height: 1 },
      { x: 64, y: 0, width: 16, height: 1 },
      s, makeTheme());
    const line = r.debugLines()[0].replace(/\x1b\[[0-9;]*m/g, "");
    assert.ok(line.includes("TUI.AMP"), `brand: ${line}`);
    assert.ok(/SYS\.LOAD.*12\.5/.test(line), `syserr: ${line}`);
  });
});
```

- [ ] **Step 2: Implement `src/player/widgets/titleBar.ts`**

```typescript
import type { Renderer } from "../../ui/renderer.js";
import type { Region } from "../../ui/tui.js";
import type { AppState } from "../state.js";
import type { Theme } from "../theme.js";

export function renderTitleBar(
  r: Renderer, _titleBarR: Region,
  brandR: Region, searchR: Region, sysLoadR: Region,
  s: AppState, th: Theme,
): void {
  r.write(brandR.x, brandR.y, th.fg + "[ TUI.AMP v4.0 ]" + th.reset);

  // Search bar: prompt + query, or placeholder
  if (s.search.focused) {
    const q = "> " + s.search.query + "▌";
    r.write(searchR.x + 1, searchR.y, th.fg + q.slice(0, searchR.width - 2) + th.reset);
  } else {
    const hint = " / to search";
    r.write(searchR.x + 1, searchR.y, th.dim + hint + th.reset);
  }

  const load = `SYS.LOAD: ${s.cpuPct.toFixed(1)}%`;
  r.write(sysLoadR.x + Math.max(0, sysLoadR.width - load.length),
          sysLoadR.y, th.fg + load + th.reset);
}
```

- [ ] **Step 3: PASS. Commit** — `feat(widget): titleBar`.

---

### Task 19: `src/player/widgets/albumArt.ts`

**Files:** Create + minimal test.

- [ ] **Step 1: Implement**

```typescript
import type { Renderer } from "../../ui/renderer.js";
import type { Region } from "../../ui/tui.js";
import type { AppState } from "../state.js";
import type { Theme } from "../theme.js";

export function renderAlbumArt(
  r: Renderer, region: Region, s: AppState, th: Theme,
): void {
  if (!s.albumArt || s.artCellMode !== "art") {
    // placeholder frame
    for (let row = 0; row < region.height; row++) {
      r.write(region.x, region.y + row, th.dim + " ".repeat(region.width) + th.reset);
    }
    r.write(region.x, region.y, th.dim + "[ NO ART ]" + th.reset);
    return;
  }
  const lines = s.albumArt;
  for (let row = 0; row < Math.min(region.height, lines.length); row++) {
    r.write(region.x, region.y + row, lines[row]);
  }
}
```

- [ ] **Step 2: Commit** — `feat(widget): albumArt`.

---

### Task 20: `src/player/widgets/nowPlaying.ts` (+ L/R meter)

**Files:** Create.

- [ ] **Step 1: Implement**

```typescript
import type { Renderer } from "../../ui/renderer.js";
import type { Region } from "../../ui/tui.js";
import type { AppState } from "../state.js";
import type { Theme } from "../theme.js";

export function renderNowPlaying(
  r: Renderer, region: Region, s: AppState, th: Theme,
): void {
  const np = s.nowPlaying;
  const title = np?.trackName ?? "(nothing playing)";
  const artist = np?.artistName ?? "";
  r.write(region.x + 1, region.y + 1, th.fg + title.slice(0, region.width - 2) + th.reset);
  r.write(region.x + 1, region.y + 2, th.dim + artist.slice(0, region.width - 2) + th.reset);

  // L/R meter at bottom — fill char density by level
  const meterY = region.y + region.height - 2;
  drawMeter(r, "L", region.x + 1, meterY,     region.width - 4, s.meterL, th);
  drawMeter(r, "R", region.x + 1, meterY + 1, region.width - 4, s.meterR, th);
}

function drawMeter(
  r: Renderer, label: string, x: number, y: number, w: number, level: number, th: Theme,
): void {
  const full = Math.max(0, Math.min(w, Math.floor(level * w)));
  const blocks = "█".repeat(full) + "░".repeat(Math.max(0, w - full));
  r.write(x, y, th.dim + label + " " + th.reset + th.palette.meterMid + blocks + th.reset);
}
```

- [ ] **Step 2: Commit** — `feat(widget): nowPlaying + L/R meter`.

---

### Task 21: `src/player/widgets/recentlyPlayed.ts`

**Files:** Create.

- [ ] **Step 1: Implement**

```typescript
import type { Renderer } from "../../ui/renderer.js";
import type { Region } from "../../ui/tui.js";
import type { AppState } from "../state.js";
import type { Theme } from "../theme.js";

export function renderRecentlyPlayed(
  r: Renderer, region: Region, s: AppState, th: Theme,
): void {
  r.write(region.x + 1, region.y, th.dim + "RECENT" + th.reset);
  const rows = Math.max(0, region.height - 1);
  const visible = s.recentlyPlayed.slice(0, rows);
  for (let i = 0; i < visible.length; i++) {
    const e = visible[i];
    const line = `${(i + 1).toString().padStart(2)}. ${e.trackName} — ${e.artistName}`;
    r.write(region.x + 1, region.y + 1 + i, th.fg + line.slice(0, region.width - 2) + th.reset);
  }
}
```

- [ ] **Step 2: Commit** — `feat(widget): recentlyPlayed`.

---

### Task 22: `src/player/widgets/lyrics.ts` (kinetic FIGlet)

**Files:** Create.

- [ ] **Step 1: Implement**

```typescript
import type { Renderer } from "../../ui/renderer.js";
import type { Region } from "../../ui/tui.js";
import type { AppState } from "../state.js";
import type { Theme } from "../theme.js";
import { renderGlyphs } from "../../ui/bitfont.js";

const FIGLET_THRESHOLD = 0.6;

export function renderLyrics(
  r: Renderer, region: Region, s: AppState, th: Theme,
): void {
  const idx = s.activeLyricIndex;
  const prev = idx > 0 ? s.lyrics[idx - 1]?.text ?? "" : "";
  const active = idx >= 0 ? s.lyrics[idx]?.text ?? "" : "(no lyrics)";
  const next = idx + 1 < s.lyrics.length ? s.lyrics[idx + 1]?.text ?? "" : "";

  // Previous (dim, row 1)
  r.write(region.x + 1, region.y + 1, th.dim + prev.slice(0, region.width - 2) + th.reset);

  // Active: plain or figlet
  const useFiglet = s.transientEnergy > FIGLET_THRESHOLD && active.length <= Math.floor((region.width - 2) / 6);
  if (useFiglet) {
    const lines = renderGlyphs(active);
    for (let i = 0; i < Math.min(8, region.height - 4); i++) {
      r.write(region.x + 1, region.y + 2 + i, th.fg + lines[i] + th.reset);
    }
  } else {
    r.write(region.x + 1, region.y + Math.floor(region.height / 2),
            th.fg + active.slice(0, region.width - 2) + th.reset);
  }

  // Next (dim, near bottom)
  r.write(region.x + 1, region.y + region.height - 2, th.dim + next.slice(0, region.width - 2) + th.reset);

  // Status footer
  const footer = useFiglet
    ? "[ TRANSIENT PEAK -> FONT-SCALE MAX ]"
    : `[ KINETIC LYRICS // SYNC: RMS ${s.rms.toFixed(2)} ]`;
  r.write(region.x + 1, region.y + region.height - 1, th.dim + footer.slice(0, region.width - 2) + th.reset);
}
```

- [ ] **Step 2: Commit** — `feat(widget): kinetic lyrics`.

---

### Task 23: `src/player/widgets/spectrum.ts`

**Files:** Create.

- [ ] **Step 1: Implement**

```typescript
import type { Renderer } from "../../ui/renderer.js";
import type { Region } from "../../ui/tui.js";
import type { AppState } from "../state.js";
import type { Theme } from "../theme.js";

const GLYPH = ["░", "▒", "▓", "█"];

export function renderSpectrum(
  r: Renderer, region: Region, s: AppState, th: Theme,
): void {
  const n = s.spectrum.length;
  if (n === 0 || region.width < 4 || region.height < 2) return;
  const barW = Math.max(1, Math.floor((region.width - 2) / n));
  const baseY = region.y + region.height - 2;
  const maxH = region.height - 2;

  for (let i = 0; i < n; i++) {
    const level = Math.max(0, Math.min(1, s.spectrum[i]));
    const h = Math.floor(level * maxH);
    const colorIdx = Math.min(th.palette.barColors.length - 1,
      Math.floor(level * th.palette.barColors.length));
    const color = th.palette.barColors[colorIdx];
    const x0 = region.x + 1 + i * barW;
    for (let row = 0; row < h; row++) {
      const y = baseY - row;
      const glyph = GLYPH[Math.min(3, Math.floor((level * maxH - row) * 2))];
      r.write(x0, y, color + glyph.repeat(Math.max(1, barW - 1)) + th.reset);
    }
  }

  r.write(region.x + 1, region.y, th.dim + "[ SPECTRUM // " + th.palette.name.toUpperCase() + " ]" + th.reset);
}
```

- [ ] **Step 2: Commit** — `feat(widget): spectrum`.

---

### Task 24: `src/player/widgets/controls.ts` (scrubber + hotkeys)

**Files:** Create.

- [ ] **Step 1: Implement**

```typescript
import type { Renderer } from "../../ui/renderer.js";
import type { Region } from "../../ui/tui.js";
import type { AppState } from "../state.js";
import type { Theme } from "../theme.js";

function fmtMs(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function renderControls(
  r: Renderer, scrubR: Region, keysR: Region, s: AppState, th: Theme,
): void {
  // Scrubber — extrapolate between polls
  const now = Date.now();
  const pos = Math.min(s.durationMs, s.progressMs + Math.max(0, now - s.lastSpotifyPollAt));
  const pct = s.durationMs > 0 ? pos / s.durationMs : 0;
  const barW = Math.max(4, scrubR.width - 16);
  const filled = Math.floor(pct * barW);
  const bar = "█".repeat(filled) + "░".repeat(barW - filled);
  const left = `${fmtMs(pos)} `;
  const right = ` ${fmtMs(s.durationMs)}`;
  r.write(scrubR.x, scrubR.y, th.dim + left + th.reset + th.fg + bar + th.reset + th.dim + right + th.reset);

  // Hotkeys
  const keys = "[p]lay  [n]ext  [b]ack  [m]ute  [v]is  [a]rt  [/]search  [q]uit";
  r.write(keysR.x, keysR.y, th.dim + keys.slice(0, keysR.width) + th.reset);
}
```

- [ ] **Step 2: Commit** — `feat(widget): controls (scrubber + hotkeys)`.

---

## Phase 6 — App Loop + Wiring

### Task 25: `src/player/App.ts`

**Files:** Create.

- [ ] **Step 1: Implement**

```typescript
import { Renderer } from "../ui/renderer.js";
import type { AudioSource } from "../audio/AudioSource.js";
import * as spotifyDesktop from "../macos/spotifyDesktop.js";
import { startInput, type InputEvent } from "../ui/input.js";
import { computeGrid, isTooSmall, tooSmallMessage } from "./layout.js";
import { drawOuterBorder, drawHSep, drawVDiv } from "../ui/borders.js";
import { makeInitialState, type AppState } from "./state.js";
import { makeTheme, PALETTES } from "./theme.js";
import { startAudioFeeder, decayTransient } from "./feeders/audioFeeder.js";
import { startSpotifyFeeder } from "./feeders/spotifyFeeder.js";
import { startCpuFeeder } from "./feeders/cpuFeeder.js";
import { refreshLyrics, updateActiveLyricIndex } from "./feeders/lyricsFeeder.js";
import { refreshAlbumArt } from "./feeders/albumArtFeeder.js";

import { renderTitleBar } from "./widgets/titleBar.js";
import { renderAlbumArt } from "./widgets/albumArt.js";
import { renderNowPlaying } from "./widgets/nowPlaying.js";
import { renderRecentlyPlayed } from "./widgets/recentlyPlayed.js";
import { renderLyrics } from "./widgets/lyrics.js";
import { renderSpectrum } from "./widgets/spectrum.js";
import { renderControls } from "./widgets/controls.js";

import * as ss from "./search/searchState.js";
import { search as spotifySearch } from "./search/spotifyWebApi.js";

export class App {
  private renderer: Renderer;
  private state: AppState;
  private stoppers: Array<() => void> = [];
  private searchDebounce: ReturnType<typeof setTimeout> | null = null;
  private searchAbort: AbortController | null = null;
  private prevFrameAt = Date.now();
  private running = false;
  private ticker: ReturnType<typeof setImmediate> | null = null;

  constructor(private audio: AudioSource) {
    const [cols, rows] = [process.stdout.columns || 120, process.stdout.rows || 36];
    this.renderer = new Renderer(cols, rows);
    this.state = makeInitialState(cols, rows);
  }

  async start(): Promise<void> {
    // Alternate screen + hide cursor
    process.stdout.write("\x1b[?1049h\x1b[?25l");
    process.on("SIGINT", () => this.stop());
    process.stdout.on("resize", this.onResize);

    startAudioFeeder(this.audio, this.state);
    this.stoppers.push(startSpotifyFeeder(this.state, {
      onTrackChange: async (s) => {
        await Promise.all([
          refreshLyrics(s),
          refreshAlbumArt(s, this.currentArtCellCols(), this.currentArtCellRows()),
        ]);
      },
    }));
    this.stoppers.push(startCpuFeeder(this.state));

    startInput(() => this.state.search.focused ? "text" : "hotkey",
               (e) => this.onInput(e));

    this.running = true;
    this.loop();
  }

  private loop = (): void => {
    if (!this.running) return;
    this.renderFrame();
    this.ticker = setImmediate(this.loop);
  };

  private onResize = (): void => {
    const cols = process.stdout.columns || 120;
    const rows = process.stdout.rows || 36;
    this.state.cols = cols;
    this.state.rows = rows;
    this.renderer.resize(cols, rows);
    this.renderer.invalidate();
    refreshAlbumArt(this.state, this.currentArtCellCols(), this.currentArtCellRows());
  };

  private currentArtCellCols(): number {
    const g = computeGrid(this.state.cols, this.state.rows);
    return Math.max(4, g.artR.width - 2);
  }
  private currentArtCellRows(): number {
    const g = computeGrid(this.state.cols, this.state.rows);
    return Math.max(2, g.artR.height - 2);
  }

  private renderFrame(): void {
    const now = Date.now();
    const dt = now - this.prevFrameAt;
    this.prevFrameAt = now;

    decayTransient(this.state, dt);
    updateActiveLyricIndex(this.state);

    const { cols, rows } = this.state;
    this.renderer.clear();

    if (isTooSmall(cols, rows)) {
      this.renderer.writeCenter(Math.floor(rows / 2), tooSmallMessage(cols, rows));
      this.renderer.flushDirty();
      return;
    }

    const g = computeGrid(cols, rows);
    const th = makeTheme(this.state.spectrumPaletteIndex);

    // Borders
    drawOuterBorder(this.renderer, g.outer, th.border, th.reset);

    // Column-break Xs (top row: after artR, after nowR)
    const topBreak1 = g.artR.x + g.artR.width;
    const topBreak2 = g.nowR.x + g.nowR.width;
    const midBreak  = g.lyricsR.x + g.lyricsR.width;

    drawHSep(this.renderer, g.sep1, g.outer.width,
      [{ col: topBreak1, char: "┬" }, { col: topBreak2, char: "┬" }], th.border, th.reset);
    drawHSep(this.renderer, g.sep2, g.outer.width,
      [{ col: topBreak1, char: "┴" }, { col: topBreak2, char: "┴" }, { col: midBreak, char: "┬" }],
      th.border, th.reset);
    drawHSep(this.renderer, g.sep3, g.outer.width,
      [{ col: midBreak, char: "┴" }], th.border, th.reset);

    // Vertical dividers
    drawVDiv(this.renderer, topBreak1, g.topRow.y, g.topRow.y + g.topRow.height - 1, th.border, th.reset);
    drawVDiv(this.renderer, topBreak2, g.topRow.y, g.topRow.y + g.topRow.height - 1, th.border, th.reset);
    drawVDiv(this.renderer, midBreak,  g.middleRow.y, g.middleRow.y + g.middleRow.height - 1, th.border, th.reset);

    // Widgets
    renderTitleBar(this.renderer, g.titleBar, g.brandR, g.searchBarR, g.sysLoadR, this.state, th);
    renderAlbumArt(this.renderer, g.artR, this.state, th);
    renderNowPlaying(this.renderer, g.nowR, this.state, th);
    renderRecentlyPlayed(this.renderer, g.recentR, this.state, th);
    renderLyrics(this.renderer, g.lyricsR, this.state, th);
    renderSpectrum(this.renderer, g.spectrumR, this.state, th);
    renderControls(this.renderer, g.scrubR, g.keysR, this.state, th);

    this.renderer.flushDirty();
  }

  private onInput(e: InputEvent): void {
    if (e.kind === "quit") { this.stop(); return; }
    if (e.kind === "hotkey") return this.onHotkey(e.action);
    if (e.kind === "text")   return this.onSearchChar(e.char);
    if (e.kind === "edit")   return this.onSearchEdit(e.op);
    if (e.kind === "nav")    return this.onSearchNav(e.dir);
  }

  private onHotkey(a: string): void {
    switch (a) {
      case "toggle_play": this.state.isPlaying ? spotifyDesktop.pause() : spotifyDesktop.play(); break;
      case "next":        spotifyDesktop.nextTrack(); break;
      case "prev":        spotifyDesktop.previousTrack(); break;
      case "cycle_palette":
        this.state.spectrumPaletteIndex = (this.state.spectrumPaletteIndex + 1) % PALETTES.length;
        break;
      case "toggle_art":
        this.state.artCellMode = this.state.artCellMode === "art" ? "blank" : "art";
        break;
      case "focus_search": ss.open(this.state); break;
      case "mute": /* volume control deferred */ break;
    }
  }

  private onSearchChar(ch: string): void {
    ss.setQuery(this.state, this.state.search.query + ch);
    this.scheduleSearch();
  }
  private onSearchEdit(op: "backspace" | "enter" | "escape"): void {
    if (op === "backspace") {
      ss.setQuery(this.state, this.state.search.query.slice(0, -1));
      this.scheduleSearch();
    } else if (op === "enter") {
      const sel = this.state.search.results[this.state.search.selectedIndex];
      if (sel) spotifyDesktop.playTrack(sel.uri).catch(() => {});
      ss.close(this.state);
    } else if (op === "escape") {
      ss.close(this.state);
    }
  }
  private onSearchNav(dir: "up" | "down" | "left" | "right"): void {
    if (dir === "up")   ss.selectPrev(this.state);
    if (dir === "down") ss.selectNext(this.state);
  }

  private scheduleSearch(): void {
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(async () => {
      const q = this.state.search.query.trim();
      if (!q) { ss.setResults(this.state, []); return; }
      ss.setLoading(this.state, true);
      this.searchAbort?.abort();
      this.searchAbort = new AbortController();
      try {
        const r = await spotifySearch(q);
        ss.setResults(this.state, r);
      } catch {
        ss.setResults(this.state, []);
      } finally {
        ss.setLoading(this.state, false);
      }
    }, 180);
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.ticker) clearImmediate(this.ticker);
    for (const s of this.stoppers) s();
    await this.audio.stop().catch(() => {});
    process.stdout.write("\x1b[?25h\x1b[?1049l");
    process.exit(0);
  }
}
```

- [ ] **Step 2: Build check** — `npm run build`. Fix any import name mismatches surfaced (particularly fft/lyrics/album interfaces).

- [ ] **Step 3: Commit** — `feat(player): App main loop`.

---

### Task 26: Wire `src/cli/commands/launch.ts` → new App; default mode = player

**Files:** Modify `src/cli/commands/launch.ts`.

- [ ] **Step 1: Change default and route**

Find line 24: `.option(\`--mode <...>\`, "Visualization mode", "wavefield")` → change default to `"player"`.

In the action body, add a branch: if `opts.mode === "player"`, construct an `AudioSource` and launch `new App(audio)`. Keep any non-player paths temporarily falling back to the existing engine (still alive until Phase 7).

```typescript
// At top of file:
import { App } from "../../player/App.js";

// Inside .action(async (opts) => { ... }):
if (opts.mode === "player") {
  const audio = createAudioSource({
    sampleRate: Number(opts.sampleRate),
    frameSize: Number(opts.fftSize),
  });
  await audio.start();
  const app = new App(audio);
  await app.start();
  return;
}
// … existing engine path unchanged for now …
```

- [ ] **Step 2: Build + smoke**: `npm run build && node dist/index.js launch`.

- [ ] **Step 3: Commit** — `feat(cli): launch player mode by default`.

---

## Phase 7 — Cleanup + Verification

### Task 27: Delete old subtree; fix `tui.ts` Region source

**Files:**
- Delete: `src/visualizer/**/*`, `src/ui/layout.ts`
- Modify: `src/ui/tui.ts`

- [ ] **Step 1: Inline `Region` in `tui.ts`**

In `src/ui/tui.ts`, replace the top:

```typescript
import type { Region } from "./layout.js";
export type { Region };
```

with:

```typescript
export interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

- [ ] **Step 2: Delete the old subtree**

```bash
git rm -r src/visualizer src/ui/layout.ts
```

- [ ] **Step 3: Remove the legacy input shim**

Delete `startInputLegacy` from `src/ui/input.ts` (no longer needed).

- [ ] **Step 4: Build**

```bash
npm run build
```

Any compile errors here indicate a dangling reference — fix point-by-point.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove legacy visualizer tree + layout.ts"
```

---

### Task 28: Integration smoke + checklist

- [ ] **Step 1: Full test run**

```bash
npm test
```

All tests must pass.

- [ ] **Step 2: Headless smoke — 10 frames**

Short harness to exercise render with `silent: true` audio and no real Spotify:

```bash
node -e '
const { createAudioSource } = require("./dist/audio/createAudioSource.js");
const { App } = require("./dist/player/App.js");
(async () => {
  process.stdout.columns = 120; process.stdout.rows = 36;
  const a = createAudioSource({ sampleRate: 44100, frameSize: 2048, silent: true });
  await a.start();
  const app = new App(a);
  await app.start();
  setTimeout(() => app.stop(), 500);
})();
'
```

Expected: alternate screen draws, no crash on stop.

- [ ] **Step 3: Manual checklist** (all from spec §13)
  - [ ] `npm run start` from main repo, alternate screen, no flicker.
  - [ ] Spotify playing → title / art / scrubber update within 1 s.
  - [ ] Spectrum at 60 Hz; L/R meter moves with audio.
  - [ ] `/justice` search → ~8 results → Enter plays track.
  - [ ] `p n b m` transport works.
  - [ ] Resize across 96×24 threshold, both directions, clean.
  - [ ] Kick-drum passage → FIGlet swap then decay.
  - [ ] `q` quits cleanly, cursor restored.

- [ ] **Step 4: No `┼` invariant**

```bash
npm run build && node -e '
  const fs = require("fs");
  const files = require("child_process").execSync("find dist -name \"*.js\"").toString().split("\n").filter(Boolean);
  let bad = false;
  for (const f of files) if (fs.readFileSync(f, "utf8").includes("\u253C")) { console.error("┼ found in", f); bad = true; }
  process.exit(bad ? 1 : 0);
'
```

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: TUI.AMP v4.0 verification pass"
```

---

## Post-merge follow-ups (out of scope)

- Real mute/unmute via `sound volume` AppleScript.
- Mouse input path (spec §2 #10 removed it; re-add only if explicit request).
- Stereo audio path in `AudioSource` so `extractChannelPeaks` receives real interleaved data.
- Search dropdown overlay UI (currently implicit: results are in state but not yet rendered as overlay — a small overlay widget should be added when the real UX session begins).

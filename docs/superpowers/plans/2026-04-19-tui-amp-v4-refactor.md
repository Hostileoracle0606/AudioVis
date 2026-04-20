# TUI.AMP v4.0 Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current `src/ui/*` + `src/visualizer/*` with a fixed-grid TUI.AMP v4.0 layout driven by a pure-widget render architecture, a dirty-region flush for 60 FPS without tearing, non-blocking feeders, and a Client-Credentials Spotify search.

**Architecture:** One `AppState` object, one 60 Hz render tick (`setImmediate`-chained), pure widgets (`(r, region, state, theme) → void`) writing into a dirty-tracked cell buffer, feeders mutating their own state slices off the render tick. Fixed grid: title bar / top row (art | now-playing | recently-played) / middle row (lyrics | spectrum, equal halves) / bottom row (scrubber + hotkeys). Hand-embedded 8×6 block bitmap font for kinetic lyrics.

**Tech Stack:** Node.js 18+, TypeScript 5.3, `axios` (already present), `jimp` (already present), `commander`, `dotenv`. No new dependencies. Tests run via `node --test` on compiled `dist/**/*.test.js`.

**Reference spec:** `docs/superpowers/specs/2026-04-19-tui-amp-v4-refactor-design.md`.

---

## Phase 0 — Baseline

### Task 0: Confirm green starting state

**Files:** none

- [ ] **Step 1: Verify type-check and test pass on current code**

Run: `npm run build && npm test`
Expected: exit 0, all tests pass. If anything fails, stop and fix before starting — this plan assumes a clean baseline.

- [ ] **Step 2: Note current file count for later verification**

Run: `find src -type f -name '*.ts' | wc -l`
Write the number down. After the refactor, we expect this count to change meaningfully (old files deleted, new files created).

---

## Phase 1 — Foundation utilities (pure, testable)

### Task 1: Rounded box + junction border primitives

**Files:**
- Create: `src/ui/borders.ts`
- Test:   `src/ui/borders.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/ui/borders.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert";
import { Renderer } from "./renderer.js";
import { drawOuterFrame, drawHSeparator, drawVDivider } from "./borders.js";

test("drawOuterFrame renders rounded corners and edges", () => {
  const r = new Renderer(6, 4);
  drawOuterFrame(r);
  const lines = r.debugLines();
  assert.strictEqual(lines[0], "\u256D\u2500\u2500\u2500\u2500\u256E"); // ╭────╮
  assert.strictEqual(lines[1], "\u2502    \u2502");                       // │    │
  assert.strictEqual(lines[2], "\u2502    \u2502");
  assert.strictEqual(lines[3], "\u2570\u2500\u2500\u2500\u2500\u256F"); // ╰────╯
});

test("drawHSeparator draws ├─...─┤ with ┬/┴ junctions at specified X", () => {
  const r = new Renderer(10, 3);
  drawOuterFrame(r);
  drawHSeparator(r, 1, { down: [3, 6], up: [] });
  const line = r.debugLines()[1];
  assert.strictEqual(line[0], "\u251C");                      // ├
  assert.strictEqual(line[3], "\u252C");                      // ┬
  assert.strictEqual(line[6], "\u252C");                      // ┬
  assert.strictEqual(line[9], "\u2524");                      // ┤
  assert.ok(!line.includes("\u253C"), "must never produce ┼");
});

test("drawHSeparator handles mixed up/down junctions without ┼", () => {
  const r = new Renderer(12, 3);
  drawOuterFrame(r);
  drawHSeparator(r, 1, { down: [6], up: [3, 9] });
  const line = r.debugLines()[1];
  assert.strictEqual(line[3], "\u2534"); // ┴
  assert.strictEqual(line[6], "\u252C"); // ┬
  assert.strictEqual(line[9], "\u2534"); // ┴
  assert.ok(!line.includes("\u253C"));
});

test("drawVDivider renders │ vertical run", () => {
  const r = new Renderer(5, 5);
  drawOuterFrame(r);
  drawVDivider(r, 2, 1, 3);
  const lines = r.debugLines();
  assert.strictEqual(lines[1][2], "\u2502");
  assert.strictEqual(lines[2][2], "\u2502");
  assert.strictEqual(lines[3][2], "\u2502");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run build 2>&1 | head -20`
Expected: TypeScript error — `borders.ts` does not exist. That's our failing state.

- [ ] **Step 3: Add `debugLines()` to the Renderer (test-only helper)**

Edit `src/ui/renderer.ts`. Inside the `Renderer` class, add after `flush()`:

```ts
  /** Test-only: return current cell buffer rows with SGR stripped. */
  debugLines(): string[] {
    const out: string[] = [];
    for (let row = 0; row < this.rows; row++) {
      const raw = this.cells
        .slice(row * this.cols, row * this.cols + this.cols)
        .join("");
      out.push(raw.replace(/\x1b\[[0-9;]*m/g, ""));
    }
    return out;
  }
```

- [ ] **Step 4: Implement borders.ts**

Create `src/ui/borders.ts`:

```ts
import type { Renderer } from "./renderer.js";

const TL = "\u256D"; const TR = "\u256E"; const BL = "\u2570"; const BR = "\u256F";
const H  = "\u2500"; const V  = "\u2502";
const LT = "\u251C"; const RT = "\u2524"; const DT = "\u252C"; const UT = "\u2534";

/** Draw a rounded rectangle around the full renderer bounds. */
export function drawOuterFrame(r: Renderer): void {
  const W = r.width, H_ = r.height;
  if (W < 2 || H_ < 2) return;
  r.write(0, 0, TL + H.repeat(W - 2) + TR);
  for (let y = 1; y < H_ - 1; y++) {
    r.write(0, y, V);
    r.write(W - 1, y, V);
  }
  r.write(0, H_ - 1, BL + H.repeat(W - 2) + BR);
}

/**
 * Draw a horizontal separator row at `y`, attaching to the outer frame via
 * ├ on the left and ┤ on the right. `junctions.down` = X coords of column
 * dividers that descend below this row (┬). `junctions.up` = X coords of
 * column dividers that ascend from above (┴).
 *
 * Throws if any X coordinate appears in both arrays — that would require ┼,
 * which the palette forbids.
 */
export function drawHSeparator(
  r: Renderer,
  y: number,
  junctions: { down: number[]; up: number[] },
): void {
  const W = r.width;
  if (W < 2) return;
  const downSet = new Set(junctions.down);
  const upSet = new Set(junctions.up);
  for (const x of downSet) {
    if (upSet.has(x)) {
      throw new Error(`Cross junction at x=${x} would require ┼, which is forbidden`);
    }
  }
  r.write(0, y, LT);
  for (let x = 1; x < W - 1; x++) {
    let ch = H;
    if (downSet.has(x)) ch = DT;
    else if (upSet.has(x)) ch = UT;
    r.write(x, y, ch);
  }
  r.write(W - 1, y, RT);
}

/** Draw a vertical divider │ at column x, from y1 to y2 inclusive. */
export function drawVDivider(r: Renderer, x: number, y1: number, y2: number): void {
  for (let y = y1; y <= y2; y++) {
    r.write(x, y, V);
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run build && node --test dist/ui/borders.test.js`
Expected: all 4 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/ui/borders.ts src/ui/borders.test.ts src/ui/renderer.ts
git commit -m "feat(ui): rounded-frame border primitives with junction guard

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 2: Dirty-region flush on the Renderer

**Files:**
- Modify: `src/ui/renderer.ts`
- Test:   `src/ui/renderer.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/ui/renderer.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert";
import { Writable } from "node:stream";
import { Renderer } from "./renderer.js";

function captureStdout(fn: () => void): string {
  const orig = process.stdout.write.bind(process.stdout);
  let buf = "";
  (process.stdout as unknown as { write: (s: string) => boolean }).write = (s: string) => {
    buf += s;
    return true;
  };
  try { fn(); } finally {
    (process.stdout as unknown as { write: typeof orig }).write = orig;
  }
  return buf;
}

test("flushDirty writes nothing when frame is unchanged", () => {
  const r = new Renderer(10, 3);
  r.write(0, 0, "hello");
  r.flush();                              // prime
  const out = captureStdout(() => r.flushDirty());
  assert.strictEqual(out, "");
});

test("flushDirty writes only the changed row with cursor positioning", () => {
  const r = new Renderer(10, 3);
  r.write(0, 0, "hello");
  r.write(0, 1, "world");
  r.flush();
  r.write(0, 1, "WORLD");
  const out = captureStdout(() => r.flushDirty());
  assert.match(out, /\x1b\[2;1H/);        // cursor to row 2
  assert.match(out, /WORLD/);
  assert.ok(!out.includes("hello"));       // row 1 not re-emitted
});

test("invalidate forces next flushDirty to resend everything", () => {
  const r = new Renderer(4, 2);
  r.write(0, 0, "abcd");
  r.flush();
  r.invalidate();
  const out = captureStdout(() => r.flushDirty());
  assert.match(out, /\x1b\[1;1H/);
  assert.match(out, /abcd/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run build 2>&1 | head -20`
Expected: `Property 'flushDirty' does not exist` and `Property 'invalidate' does not exist`.

- [ ] **Step 3: Add `flushDirty()` and `invalidate()` to renderer.ts**

Edit `src/ui/renderer.ts`. Add a private field:

```ts
  private prevLines: string[] = [];
```

Extract the line-building loop from `flush()` into a private helper, then add the two public methods. Full replacement for `flush()` and new methods:

```ts
  private buildLines(): string[] {
    const out: string[] = [];
    for (let row = 0; row < this.rows; row++) {
      out.push(
        this.cells.slice(row * this.cols, row * this.cols + this.cols).join("")
      );
    }
    return out;
  }

  flush(): void {
    const lines = this.buildLines();
    process.stdout.write("\x1b[H" + lines.join("\n"));
    this.prevLines = lines;
  }

  flushDirty(): void {
    const lines = this.buildLines();
    let out = "";
    for (let row = 0; row < this.rows; row++) {
      if (lines[row] !== this.prevLines[row]) {
        out += `\x1b[${row + 1};1H\x1b[0m${lines[row]}`;
      }
    }
    if (out) process.stdout.write(out);
    this.prevLines = lines;
  }

  invalidate(): void {
    this.prevLines = [];
  }
```

Also update `resize()` to reset `prevLines`:

```ts
  resize(cols: number, rows: number): void {
    this.cols = cols;
    this.rows = rows;
    this.cells = new Array(cols * rows).fill(" ");
    this.prevLines = [];
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run build && node --test dist/ui/renderer.test.js`
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/ui/renderer.ts src/ui/renderer.test.ts
git commit -m "feat(ui): dirty-region flush for tear-free 60 FPS

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 3: 8×6 block bitmap font for kinetic lyrics

**Files:**
- Create: `src/ui/bitfont.ts`
- Test:   `src/ui/bitfont.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/ui/bitfont.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert";
import { GLYPHS, renderBigLine, GLYPH_H, GLYPH_W } from "./bitfont.js";

test("every glyph is exactly GLYPH_H rows tall", () => {
  for (const [ch, rows] of Object.entries(GLYPHS)) {
    assert.strictEqual(rows.length, GLYPH_H, `glyph '${ch}' has ${rows.length} rows, want ${GLYPH_H}`);
  }
});

test("every glyph row is exactly GLYPH_W cells wide", () => {
  for (const [ch, rows] of Object.entries(GLYPHS)) {
    for (let i = 0; i < rows.length; i++) {
      assert.strictEqual(rows[i].length, GLYPH_W, `glyph '${ch}' row ${i} width ${rows[i].length}, want ${GLYPH_W}`);
    }
  }
});

test("every glyph uses only allowed block characters", () => {
  const allowed = new Set([" ", "\u2588", "\u2593", "\u2592", "\u2591"]);
  for (const [ch, rows] of Object.entries(GLYPHS)) {
    for (const row of rows) {
      for (const c of row) {
        assert.ok(allowed.has(c), `glyph '${ch}' contains disallowed char '${c}' (${c.codePointAt(0)!.toString(16)})`);
      }
    }
  }
});

test("renderBigLine returns GLYPH_H rows with correct width", () => {
  const rows = renderBigLine("AB");
  assert.strictEqual(rows.length, GLYPH_H);
  const expectedWidth = 2 * GLYPH_W + 1; // one space between glyphs
  for (const r of rows) assert.strictEqual(r.length, expectedWidth);
});

test("renderBigLine handles missing glyph by substituting space", () => {
  const rows = renderBigLine("~");
  for (const r of rows) assert.match(r, /^ +$/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run build 2>&1 | head -20`
Expected: `Cannot find module './bitfont.js'`.

- [ ] **Step 3: Implement the bitmap font**

Create `src/ui/bitfont.ts`. This is the core art asset — each glyph is 8 rows × 6 cols using `█` (solid) with occasional `▓` for anti-aliasing hints:

```ts
export const GLYPH_H = 8;
export const GLYPH_W = 6;

// Lightweight 8x6 block font. Covers A-Z 0-9 and common punctuation.
// Missing chars render as all-space (caller can detect via GLYPHS[ch] !== undefined).
export const GLYPHS: Record<string, string[]> = {
  " ": ["      ","      ","      ","      ","      ","      ","      ","      "],
  "A": ["  ██  ","  ██  "," ████ "," █  █ ","██████","██  ██","██  ██","      "],
  "B": ["█████ ","██  ██","██  ██","█████ ","██  ██","██  ██","█████ ","      "],
  "C": [" ████ ","██  ██","██    ","██    ","██    ","██  ██"," ████ ","      "],
  "D": ["████  ","██ ██ ","██  ██","██  ██","██  ██","██ ██ ","████  ","      "],
  "E": ["██████","██    ","██    ","█████ ","██    ","██    ","██████","      "],
  "F": ["██████","██    ","██    ","█████ ","██    ","██    ","██    ","      "],
  "G": [" ████ ","██  ██","██    ","██ ███","██  ██","██  ██"," ████ ","      "],
  "H": ["██  ██","██  ██","██  ██","██████","██  ██","██  ██","██  ██","      "],
  "I": [" ████ ","  ██  ","  ██  ","  ██  ","  ██  ","  ██  "," ████ ","      "],
  "J": ["   ███","    ██","    ██","    ██","    ██","██  ██"," ████ ","      "],
  "K": ["██  ██","██ ██ ","████  ","███   ","████  ","██ ██ ","██  ██","      "],
  "L": ["██    ","██    ","██    ","██    ","██    ","██    ","██████","      "],
  "M": ["██  ██","██████","██████","██████","██  ██","██  ██","██  ██","      "],
  "N": ["██  ██","███ ██","████ █","██ █ █","██  ██","██  ██","██  ██","      "],
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
  "Y": ["██  ██","██  ██"," ████ ","  ██  ","  ██  ","  ██  ","  ██  ","      "],
  "Z": ["██████","    ██","   ██ ","  ██  "," ██   ","██    ","██████","      "],
  "0": [" ████ ","██  ██","██ ███","██████","███ ██","██  ██"," ████ ","      "],
  "1": ["  ██  "," ███  ","  ██  ","  ██  ","  ██  ","  ██  "," █████","      "],
  "2": [" ████ ","██  ██","    ██","  ███ "," ██   ","██    ","██████","      "],
  "3": [" ████ ","██  ██","    ██","  ███ ","    ██","██  ██"," ████ ","      "],
  "4": ["   ███","  ████"," ██ ██","██  ██","██████","    ██","    ██","      "],
  "5": ["██████","██    ","██    ","█████ ","    ██","██  ██"," ████ ","      "],
  "6": [" ████ ","██    ","██    ","█████ ","██  ██","██  ██"," ████ ","      "],
  "7": ["██████","    ██","   ██ ","  ██  "," ██   ","██    ","██    ","      "],
  "8": [" ████ ","██  ██","██  ██"," ████ ","██  ██","██  ██"," ████ ","      "],
  "9": [" ████ ","██  ██","██  ██"," █████","    ██","    ██"," ████ ","      "],
  ".": ["      ","      ","      ","      ","      ","  ██  ","  ██  ","      "],
  ",": ["      ","      ","      ","      ","      ","  ██  ","  ██  "," ██   "],
  "!": ["  ██  ","  ██  ","  ██  ","  ██  ","      ","  ██  ","  ██  ","      "],
  "?": [" ████ ","██  ██","    ██","   ██ ","  ██  ","      ","  ██  ","      "],
  "'": ["  ██  ","  ██  ","      ","      ","      ","      ","      ","      "],
};

/**
 * Render a string as an array of `GLYPH_H` lines using the block font.
 * Unknown characters produce a blank (all-space) glyph column.
 * Glyphs are separated by one blank column.
 */
export function renderBigLine(text: string): string[] {
  const upper = text.toUpperCase();
  const lines: string[] = new Array(GLYPH_H).fill("");
  for (let i = 0; i < upper.length; i++) {
    const ch = upper[i];
    const glyph = GLYPHS[ch] ?? GLYPHS[" "];
    for (let r = 0; r < GLYPH_H; r++) {
      lines[r] += glyph[r];
      if (i < upper.length - 1) lines[r] += " ";
    }
  }
  return lines;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run build && node --test dist/ui/bitfont.test.js`
Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/ui/bitfont.ts src/ui/bitfont.test.ts
git commit -m "feat(ui): 8x6 block bitmap font for kinetic lyrics

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 4: DSP channel-peak helper (additive, no existing code changed)

**Files:**
- Create: `src/dsp/channelPeaks.ts`
- Test:   `src/dsp/channelPeaks.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/dsp/channelPeaks.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert";
import { extractChannelPeaks } from "./channelPeaks.js";

test("extractChannelPeaks on mono returns single peak", () => {
  const buf = new Float32Array([0.1, -0.3, 0.5, -0.7]);
  assert.deepStrictEqual(extractChannelPeaks(buf, 1), [0.7]);
});

test("extractChannelPeaks on stereo returns per-channel peaks", () => {
  // Interleaved: L0 R0 L1 R1 L2 R2
  const buf = new Float32Array([0.1, 0.8, 0.2, -0.4, -0.9, 0.3]);
  const [l, r] = extractChannelPeaks(buf, 2);
  assert.strictEqual(l, 0.9);
  assert.strictEqual(r, 0.8);
});

test("extractChannelPeaks returns zeros for empty buffer", () => {
  assert.deepStrictEqual(extractChannelPeaks(new Float32Array(0), 2), [0, 0]);
});

test("extractChannelPeaks clamps to [0,1]", () => {
  const buf = new Float32Array([2.0, -3.5]);
  const [l, r] = extractChannelPeaks(buf, 2);
  assert.strictEqual(l, 1);
  assert.strictEqual(r, 1);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run build 2>&1 | head -5`
Expected: `Cannot find module './channelPeaks.js'`.

- [ ] **Step 3: Implement channelPeaks.ts**

Create `src/dsp/channelPeaks.ts`:

```ts
/**
 * Return the absolute peak value per channel from an interleaved PCM buffer.
 * Samples are expected in [-1, 1]; the result is clamped to [0, 1].
 */
export function extractChannelPeaks(
  interleaved: Float32Array,
  numChannels: number,
): number[] {
  const peaks = new Array<number>(numChannels).fill(0);
  const n = interleaved.length;
  for (let i = 0; i < n; i++) {
    const ch = i % numChannels;
    const v = Math.abs(interleaved[i]);
    if (v > peaks[ch]) peaks[ch] = v;
  }
  for (let c = 0; c < numChannels; c++) {
    if (peaks[c] > 1) peaks[c] = 1;
  }
  return peaks;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run build && node --test dist/dsp/channelPeaks.test.js`
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/dsp/channelPeaks.ts src/dsp/channelPeaks.test.ts
git commit -m "feat(dsp): extractChannelPeaks helper for per-channel metering

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 5: `playTrack(uri)` on Spotify Desktop bridge

**Files:**
- Modify: `src/macos/spotifyDesktop.ts`
- Test:   `src/macos/spotifyDesktop.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/macos/spotifyDesktop.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert";
import { playTrack } from "./spotifyDesktop.js";

test("playTrack rejects non-spotify-track URIs", async () => {
  await assert.rejects(
    () => playTrack("https://example.com/song"),
    /spotify:track:/
  );
});

test("playTrack rejects empty URI", async () => {
  await assert.rejects(() => playTrack(""), /spotify:track:/);
});
```

- [ ] **Step 2: Run to verify failing**

Run: `npm run build 2>&1 | head -5`
Expected: `has no exported member 'playTrack'`.

- [ ] **Step 3: Implement `playTrack`**

Edit `src/macos/spotifyDesktop.ts`. Add at the bottom of the file (after `previousTrack`):

```ts
/**
 * Play a Spotify track by URI. The URI must be of the form
 * `spotify:track:<id>` — this is what `/v1/search` returns and what
 * Spotify's AppleScript dictionary's `play track` verb accepts.
 */
export async function playTrack(uri: string): Promise<void> {
  if (!/^spotify:track:[A-Za-z0-9]+$/.test(uri)) {
    throw new Error(`Invalid Spotify track URI: ${JSON.stringify(uri)} (expected form spotify:track:<id>)`);
  }
  await tell(`play track "${uri}"`);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run build && node --test dist/macos/spotifyDesktop.test.js`
Expected: 2 tests pass (skipped on non-darwin, but the validation logic runs before the platform check).

- [ ] **Step 5: Commit**

```bash
git add src/macos/spotifyDesktop.ts src/macos/spotifyDesktop.test.ts
git commit -m "feat(macos): playTrack(uri) for search-driven playback

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Phase 2 — Audio pipeline goes stereo

### Task 6: Switch audio backends to stereo capture

**Files:**
- Modify: `src/audio/AudioSource.ts`
- Modify: `src/audio/platform/linux.ts`
- Modify: `src/audio/platform/macos.ts`
- Modify: `src/audio/platform/windows.ts`
- Modify: `src/audio/silent.ts`

- [ ] **Step 1: Update `AudioSourceOptions` and the doc comment**

Edit `src/audio/AudioSource.ts`. Change the file comment (lines 1-7) from "raw mono f32le PCM" to:

```ts
/**
 * AudioSource — interface for platform audio capture backends.
 *
 * Each backend spawns a child process (e.g. parecord, ffmpeg) that
 * streams raw **stereo interleaved** f32le PCM to stdout. Consumers that
 * need mono (e.g. FFT) mix down; consumers that need per-channel data
 * (e.g. L/R metering) read channels directly from the interleaved frame.
 */
```

Add a `numChannels` field to `AudioSourceInfo`:

```ts
export interface AudioSourceInfo {
  platform: string;
  device: string;
  sampleRate: number;
  frameSize: number;
  numChannels: number;  // always 2 (stereo) as of v4.0
}
```

- [ ] **Step 2: Read each platform backend to locate the channel-count flag**

Run: `grep -n "ac 1\|ac=1\|channels 1\|channels=1" src/audio/platform/*.ts`

Record the line numbers for each file; we need to change each `-ac 1` → `-ac 2` (ffmpeg) or equivalent for parecord.

- [ ] **Step 3: Change each backend to stereo**

For each of `linux.ts`, `macos.ts`, `windows.ts`, `silent.ts`:
- Locate the ffmpeg/parecord args (`-ac 1`, or `parecord --channels=1`) and change to 2.
- Update the frame reader — if it assumes mono samples, the Float32Array returned is now interleaved stereo of the same sample count (frameSize is in **samples** per channel, so the byte count doubles).
- Ensure `getInfo()` returns `numChannels: 2`.

**Read each file first, then apply targeted edits. Each file should need ≤ 4 edits.**

For `silent.ts`, the zero-filled frame length doubles (interleaved stereo means 2× the samples). Update the allocation.

- [ ] **Step 4: Type-check**

Run: `npm run build`
Expected: compiles. If downstream consumers in `src/dsp/` break (e.g., existing `computeMagnitudeSpectrum` expects a mono Float32Array and now gets interleaved stereo), we fix that in the next task.

- [ ] **Step 5: Commit**

```bash
git add src/audio/
git commit -m "feat(audio): capture stereo interleaved PCM for per-channel metering

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 7: Deinterleave helper + update FFT consumer sites

**Files:**
- Create: `src/dsp/deinterleave.ts`
- Test:   `src/dsp/deinterleave.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/dsp/deinterleave.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert";
import { mixToMono, extractChannel } from "./deinterleave.js";

test("mixToMono averages L and R", () => {
  const interleaved = new Float32Array([0.2, 0.8, -0.4, 0.0]);
  const mono = mixToMono(interleaved, 2);
  assert.strictEqual(mono.length, 2);
  assert.ok(Math.abs(mono[0] - 0.5) < 1e-6);
  assert.ok(Math.abs(mono[1] - -0.2) < 1e-6);
});

test("mixToMono handles already-mono input as passthrough copy", () => {
  const mono = mixToMono(new Float32Array([0.1, -0.2]), 1);
  assert.deepStrictEqual(Array.from(mono), [0.1, -0.2]);
});

test("extractChannel returns one channel from interleaved stereo", () => {
  const buf = new Float32Array([1, 2, 3, 4, 5, 6]);
  assert.deepStrictEqual(Array.from(extractChannel(buf, 2, 0)), [1, 3, 5]);
  assert.deepStrictEqual(Array.from(extractChannel(buf, 2, 1)), [2, 4, 6]);
});
```

- [ ] **Step 2: Verify failing**

Run: `npm run build 2>&1 | head -5`
Expected: `Cannot find module './deinterleave.js'`.

- [ ] **Step 3: Implement deinterleave.ts**

Create `src/dsp/deinterleave.ts`:

```ts
/**
 * Mix an interleaved multi-channel buffer to a mono Float32Array by averaging
 * all channels per sample index. For numChannels=1 this is just a copy.
 */
export function mixToMono(interleaved: Float32Array, numChannels: number): Float32Array {
  if (numChannels === 1) return interleaved.slice();
  const frames = Math.floor(interleaved.length / numChannels);
  const out = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    let sum = 0;
    for (let c = 0; c < numChannels; c++) {
      sum += interleaved[f * numChannels + c];
    }
    out[f] = sum / numChannels;
  }
  return out;
}

/**
 * Extract one channel from an interleaved buffer. channelIndex is 0-based.
 */
export function extractChannel(
  interleaved: Float32Array,
  numChannels: number,
  channelIndex: number,
): Float32Array {
  const frames = Math.floor(interleaved.length / numChannels);
  const out = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    out[f] = interleaved[f * numChannels + channelIndex];
  }
  return out;
}
```

- [ ] **Step 4: Run tests**

Run: `npm run build && node --test dist/dsp/deinterleave.test.js`
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/dsp/deinterleave.ts src/dsp/deinterleave.test.ts
git commit -m "feat(dsp): mixToMono + extractChannel for stereo pipeline

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Phase 3 — Grid layout module

### Task 8: `src/player/layout.ts` + tests

**Files:**
- Create: `src/player/layout.ts`
- Test:   `src/player/layout.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/player/layout.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert";
import { computeAppLayout, MIN_COLS, MIN_ROWS } from "./layout.js";

test("layout tiles inner area exactly (no overlap, no gap)", () => {
  const L = computeAppLayout(120, 40);
  assert.strictEqual(L.tooSmall, false);
  // Title bar row
  assert.strictEqual(L.titleBar.y, 1);
  assert.strictEqual(L.titleBar.height, 1);
  // Middle row horizontal halves are equal (the hard requirement)
  assert.strictEqual(L.lyricsR.width, L.spectrumR.width,
    "middle row halves must be exactly equal in width");
  // Middle row cells together fill the inner width
  assert.strictEqual(L.lyricsR.width + L.spectrumR.width, 118);
  // Top row three columns sum to inner width
  assert.strictEqual(
    L.artR.width + L.nowR.width + L.recentR.width, 118,
    "top row columns must sum to inner width"
  );
});

test("layout reports tooSmall below minimums", () => {
  const L = computeAppLayout(MIN_COLS - 1, MIN_ROWS);
  assert.strictEqual(L.tooSmall, true);
});

test("layout provides junction X coordinates for separators", () => {
  const L = computeAppLayout(120, 40);
  // sep2 is below the top row: two ┴ (top-row dividers end) + one ┬ (middle-row divider begins)
  assert.strictEqual(L.sep2Up.length, 2);
  assert.strictEqual(L.sep2Down.length, 1);
  // Middle-row divider X = outer.x + 1 + lyricsR.width
  const expectedMid = 1 + L.lyricsR.width;
  assert.strictEqual(L.sep2Down[0], expectedMid);
});
```

- [ ] **Step 2: Verify failing**

Run: `npm run build 2>&1 | head -5`
Expected: `Cannot find module './layout.js'`.

- [ ] **Step 3: Implement the layout function**

Create `src/player/layout.ts`:

```ts
import { hSplit, vSplit, C } from "../ui/tui.js";
import type { Region } from "../ui/tui.js";

export const MIN_COLS = 96;
export const MIN_ROWS = 24;
const TOP_ROW_H = 10;
const BOTTOM_ROW_H = 2;

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
  artR: Region;
  nowR: Region;
  recentR: Region;
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
  const inner: Region = { x: 1, y: 1, width: Math.max(0, cols - 2), height: Math.max(0, rows - 2) };
  const tooSmall = cols < MIN_COLS || rows < MIN_ROWS;

  const [titleBar, sep1R, topRow, sep2R, middleRow, sep3R, bottomRow] = vSplit(inner, [
    C.length(1),
    C.length(1),
    C.length(TOP_ROW_H),
    C.length(1),
    C.fill(),
    C.length(1),
    C.length(BOTTOM_ROW_H),
  ]);

  const [brandR, searchR, sysLoadR] = hSplit(titleBar, [
    C.length(16), C.fill(), C.length(16),
  ]);

  const [artR, nowR, recentR] = hSplit(topRow, [
    C.percent(33), C.percent(34), C.percent(33),
  ]);

  const [lyricsR, spectrumR] = hSplit(middleRow, [
    C.percent(50), C.percent(50),
  ]);

  const [scrubR, keysR] = vSplit(bottomRow, [C.length(1), C.length(1)]);

  // Junction X coordinates are absolute (0-indexed from outer.x).
  const sep1Down = [artR.x + artR.width - 1 + 1, nowR.x + nowR.width - 1 + 1].filter(
    (x) => x > inner.x && x < inner.x + inner.width - 1
  );
  // (Each col-break X is the cell *after* the column ends. hSplit returns
  //  contiguous regions so artR.x + artR.width == nowR.x; we drop the divider
  //  line *on* that boundary as the junction X.)
  const colBreakA = artR.x + artR.width;
  const colBreakB = nowR.x + nowR.width;
  const midBreak  = lyricsR.x + lyricsR.width;

  return {
    outer, inner,
    titleBar, brandR, searchR, sysLoadR,
    sep1Y: sep1R.y,
    sep1Down: [colBreakA, colBreakB],
    topRow, artR, nowR, recentR,
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

- [ ] **Step 4: Run tests**

Run: `npm run build && node --test dist/player/layout.test.js`
Expected: 3 tests pass. If the equal-width assertion fails, `C.percent(50)` rounding is off — in that case, we'd rebalance by using `C.fill()` for both halves with a guarded even-width check. (For 118-wide inner, 50% = 59, so both halves are 59; sum = 118. ✓)

- [ ] **Step 5: Commit**

```bash
git add src/player/layout.ts src/player/layout.test.ts
git commit -m "feat(player): grid layout math with junction coordinates

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Phase 4 — State + theme

### Task 9: `AppState` interface and ring buffer helper

**Files:**
- Create: `src/player/state.ts`
- Test:   `src/player/state.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/player/state.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert";
import { createInitialState, pushRecentlyPlayed } from "./state.js";

const track = (id: string) => ({
  trackName: `t-${id}`,
  artistName: "a",
  albumName: "al",
  albumArtUrl: "",
  deviceName: "Spotify",
  isPlaying: true,
  progressMs: 0,
  durationMs: 1000,
});

test("createInitialState returns sane defaults", () => {
  const s = createInitialState(120, 40);
  assert.strictEqual(s.cols, 120);
  assert.strictEqual(s.rows, 40);
  assert.strictEqual(s.spectrum.length, 16);
  assert.strictEqual(s.recentlyPlayed.length, 0);
  assert.strictEqual(s.search.focused, false);
});

test("pushRecentlyPlayed dedups same-trackName in a row", () => {
  const s = createInitialState(120, 40);
  pushRecentlyPlayed(s, track("1"));
  pushRecentlyPlayed(s, track("1"));
  assert.strictEqual(s.recentlyPlayed.length, 1);
});

test("pushRecentlyPlayed preserves order most-recent-first", () => {
  const s = createInitialState(120, 40);
  pushRecentlyPlayed(s, track("a"));
  pushRecentlyPlayed(s, track("b"));
  pushRecentlyPlayed(s, track("c"));
  assert.deepStrictEqual(s.recentlyPlayed.map(e => e.trackName), ["t-c", "t-b", "t-a"]);
});

test("pushRecentlyPlayed caps at 8 entries", () => {
  const s = createInitialState(120, 40);
  for (let i = 0; i < 20; i++) pushRecentlyPlayed(s, track(String(i)));
  assert.strictEqual(s.recentlyPlayed.length, 8);
  assert.strictEqual(s.recentlyPlayed[0].trackName, "t-19");
  assert.strictEqual(s.recentlyPlayed[7].trackName, "t-12");
});
```

- [ ] **Step 2: Verify failing**

Run: `npm run build 2>&1 | head -5`

- [ ] **Step 3: Implement state.ts**

Create `src/player/state.ts`:

```ts
import type { DesktopState } from "../macos/spotifyDesktop.js";
import type { AsciiArt } from "../album/converter.js";

export interface LrcLine { timeMs: number; text: string; }

export interface SearchResult {
  id: string;
  uri: string;          // "spotify:track:<id>"
  name: string;
  artist: string;
  album: string;
  durationMs: number;
}

export type ArtCellMode = "art" | "vu" | "blank";

export interface AppState {
  cols: number;
  rows: number;

  spectrum: Float32Array;      // 16 smoothed buckets, 0..1
  meterL: number;
  meterR: number;
  rms: number;
  transientPeak: boolean;
  transientEnergy: number;     // 0..1 with decay

  nowPlaying: DesktopState | null;
  recentlyPlayed: DesktopState[];
  isPlaying: boolean;
  progressMs: number;
  durationMs: number;
  lastSpotifyPollAt: number;   // ms timestamp

  lyrics: LrcLine[];
  activeLyricIndex: number;    // -1 if none

  albumArt: AsciiArt | null;

  cpuPct: number;

  search: {
    focused: boolean;
    query: string;
    results: SearchResult[];
    selectedIndex: number;
    loading: boolean;
    error: string | null;
  };

  spectrumPaletteIndex: number;
  artCellMode: ArtCellMode;
  isMuted: boolean;
  savedVolume: number;         // last non-zero volume before mute

  quit: boolean;
}

export function createInitialState(cols: number, rows: number): AppState {
  return {
    cols, rows,
    spectrum: new Float32Array(16),
    meterL: 0, meterR: 0, rms: 0,
    transientPeak: false, transientEnergy: 0,
    nowPlaying: null,
    recentlyPlayed: [],
    isPlaying: false,
    progressMs: 0, durationMs: 0, lastSpotifyPollAt: 0,
    lyrics: [], activeLyricIndex: -1,
    albumArt: null,
    cpuPct: 0,
    search: { focused: false, query: "", results: [], selectedIndex: 0, loading: false, error: null },
    spectrumPaletteIndex: 0,
    artCellMode: "art",
    isMuted: false, savedVolume: 50,
    quit: false,
  };
}

/**
 * Push a Spotify state onto the recently-played ring.
 * Dedups when head has the same trackName+artistName. Caps length at 8.
 */
export function pushRecentlyPlayed(state: AppState, entry: DesktopState): void {
  const head = state.recentlyPlayed[0];
  if (head && head.trackName === entry.trackName && head.artistName === entry.artistName) {
    return;
  }
  state.recentlyPlayed = [entry, ...state.recentlyPlayed].slice(0, 8);
}
```

- [ ] **Step 4: Run tests**

Run: `npm run build && node --test dist/player/state.test.js`
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/player/state.ts src/player/state.test.ts
git commit -m "feat(player): AppState interface + recently-played ring buffer

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 10: `src/player/theme.ts` palette module

**Files:**
- Create: `src/player/theme.ts`

- [ ] **Step 1: Create theme.ts**

Create `src/player/theme.ts`:

```ts
export interface Theme {
  fg: string;          // SGR for default foreground
  dim: string;         // dimmed text
  border: string;      // box-drawing characters
  accent: string;      // title bar accent
  spectrum: string[];  // per-bucket colour, indexed by palette index
  meter: string;       // L/R meter
  reset: string;
}

const SGR = (n: string) => `\x1b[${n}m`;
const FG256 = (n: number) => SGR(`38;5;${n}`);

const PALETTE_WARM    = [208, 208, 214, 214, 220, 220, 226, 226, 220, 220, 214, 214, 208, 208, 202, 202];
const PALETTE_TEAL    = [ 37,  37,  43,  43,  49,  49,  79,  79,  49,  49,  43,  43,  37,  37,  30,  30];
const PALETTE_MAGENTA = [161, 161, 162, 162, 165, 165, 171, 171, 165, 165, 162, 162, 161, 161, 125, 125];
const PALETTE_MONO    = new Array(16).fill(250);

const PALETTES = [PALETTE_WARM, PALETTE_TEAL, PALETTE_MAGENTA, PALETTE_MONO];

export const PALETTE_COUNT = PALETTES.length;

export function buildTheme(paletteIndex: number, noColor: boolean): Theme {
  if (noColor) {
    return {
      fg: "", dim: "", border: "", accent: "", meter: "", reset: "",
      spectrum: new Array(16).fill(""),
    };
  }
  const palette = PALETTES[paletteIndex % PALETTES.length];
  return {
    fg: FG256(253),
    dim: FG256(244),
    border: FG256(240),
    accent: FG256(208),
    meter: FG256(palette[8]),
    reset: SGR("0"),
    spectrum: palette.map((n) => FG256(n)),
  };
}
```

- [ ] **Step 2: Type-check**

Run: `npm run build`
Expected: compiles.

- [ ] **Step 3: Commit**

```bash
git add src/player/theme.ts
git commit -m "feat(player): colour palettes for spectrum, UI, and meters

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Phase 5 — Search subsystem

### Task 11: Client-Credentials token + `/v1/search`

**Files:**
- Create: `src/player/search/spotifyWebApi.ts`
- Test:   `src/player/search/spotifyWebApi.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/player/search/spotifyWebApi.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert";
import { __setAxiosForTest, __resetTokenCacheForTest, searchTracks, getAccessToken } from "./spotifyWebApi.js";

function mockAxios(plan: Array<{ url: RegExp; method: "get" | "post"; reply: { status: number; data: unknown } | Error }>) {
  let idx = 0;
  return {
    get: async (url: string) => {
      const step = plan[idx++];
      assert.ok(step, `no more mock steps (got GET ${url})`);
      assert.strictEqual(step.method, "get");
      assert.ok(step.url.test(url), `unexpected URL: ${url}`);
      if (step.reply instanceof Error) throw step.reply;
      if (step.reply.status >= 400) {
        const err: any = new Error("http"); err.response = step.reply; throw err;
      }
      return step.reply;
    },
    post: async (url: string) => {
      const step = plan[idx++];
      assert.ok(step);
      assert.strictEqual(step.method, "post");
      assert.ok(step.url.test(url));
      return step.reply as { status: number; data: unknown };
    },
  };
}

test("getAccessToken caches the bearer until near expiry", async () => {
  __resetTokenCacheForTest();
  __setAxiosForTest(mockAxios([
    { url: /accounts\.spotify\.com\/api\/token/, method: "post", reply: { status: 200, data: { access_token: "T1", expires_in: 3600 } } },
  ]) as any);
  process.env.SPOTIFY_CLIENT_ID = "cid";
  process.env.SPOTIFY_CLIENT_SECRET = "csecret";
  const t1 = await getAccessToken();
  const t2 = await getAccessToken();
  assert.strictEqual(t1, "T1");
  assert.strictEqual(t2, "T1");
});

test("searchTracks returns normalized results", async () => {
  __resetTokenCacheForTest();
  __setAxiosForTest(mockAxios([
    { url: /api\/token/, method: "post", reply: { status: 200, data: { access_token: "T", expires_in: 3600 } } },
    { url: /\/v1\/search/, method: "get", reply: { status: 200, data: {
      tracks: { items: [
        { id: "x1", uri: "spotify:track:x1", name: "Song", duration_ms: 240000,
          artists: [{ name: "Art1" }, { name: "Art2" }],
          album: { name: "Alb" } },
      ] }
    } } },
  ]) as any);
  const results = await searchTracks("justice");
  assert.strictEqual(results.length, 1);
  assert.strictEqual(results[0].uri, "spotify:track:x1");
  assert.strictEqual(results[0].artist, "Art1, Art2");
});

test("searchTracks retries once on 401 by re-fetching token", async () => {
  __resetTokenCacheForTest();
  __setAxiosForTest(mockAxios([
    { url: /api\/token/, method: "post", reply: { status: 200, data: { access_token: "T1", expires_in: 3600 } } },
    { url: /\/v1\/search/, method: "get", reply: { status: 401, data: {} } },
    { url: /api\/token/, method: "post", reply: { status: 200, data: { access_token: "T2", expires_in: 3600 } } },
    { url: /\/v1\/search/, method: "get", reply: { status: 200, data: { tracks: { items: [] } } } },
  ]) as any);
  const results = await searchTracks("x");
  assert.deepStrictEqual(results, []);
});
```

- [ ] **Step 2: Verify failing**

Run: `npm run build 2>&1 | head -5`

- [ ] **Step 3: Implement spotifyWebApi.ts**

Create `src/player/search/spotifyWebApi.ts`:

```ts
import realAxios from "axios";
import type { SearchResult } from "../state.js";

type HttpClient = {
  get: (url: string, config?: any) => Promise<{ status: number; data: any }>;
  post: (url: string, body?: any, config?: any) => Promise<{ status: number; data: any }>;
};

let httpClient: HttpClient = realAxios as unknown as HttpClient;

export function __setAxiosForTest(c: HttpClient) { httpClient = c; }

interface TokenCache { token: string; expiresAt: number; }
let tokenCache: TokenCache | null = null;

export function __resetTokenCacheForTest() { tokenCache = null; }

export async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt - now > 60_000) return tokenCache.token;
  const cid = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!cid || !secret) throw new Error("Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET");
  const basic = Buffer.from(`${cid}:${secret}`).toString("base64");
  const res = await httpClient.post(
    "https://accounts.spotify.com/api/token",
    "grant_type=client_credentials",
    {
      headers: {
        "Authorization": `Basic ${basic}`,
        "Content-Type":  "application/x-www-form-urlencoded",
      },
    }
  );
  const token = res.data.access_token as string;
  const expiresIn = (res.data.expires_in as number) ?? 3600;
  tokenCache = { token, expiresAt: now + expiresIn * 1000 };
  return token;
}

export async function searchTracks(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  let token = await getAccessToken();
  const doSearch = async (tk: string) => httpClient.get(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(trimmed)}&type=track&limit=8`,
    { headers: { Authorization: `Bearer ${tk}` }, signal }
  );
  let res;
  try {
    res = await doSearch(token);
  } catch (err: any) {
    if (err?.response?.status === 401) {
      tokenCache = null;
      token = await getAccessToken();
      res = await doSearch(token);
    } else {
      throw err;
    }
  }
  const items = (res.data?.tracks?.items ?? []) as any[];
  return items.map((it) => ({
    id: it.id,
    uri: it.uri,
    name: it.name,
    artist: (it.artists ?? []).map((a: any) => a.name).join(", "),
    album: it.album?.name ?? "",
    durationMs: it.duration_ms ?? 0,
  }));
}
```

- [ ] **Step 4: Run tests**

Run: `npm run build && node --test dist/player/search/spotifyWebApi.test.js`
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/player/search/spotifyWebApi.ts src/player/search/spotifyWebApi.test.ts
git commit -m "feat(search): Spotify Web API Client Credentials token + search

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Phase 6 — Input subsystem

### Task 12: Restructure `src/ui/input.ts` for two-mode input

**Files:**
- Modify: `src/ui/input.ts` (complete rewrite, keeping filename)
- Test:   `src/ui/input.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/ui/input.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert";
import { dispatchKey, type InputEvent } from "./input.js";

function collect(mode: "hotkey" | "text", keys: Array<{ name?: string; sequence?: string; ctrl?: boolean }>): InputEvent[] {
  const out: InputEvent[] = [];
  for (const k of keys) dispatchKey(() => mode, (e) => out.push(e), k);
  return out;
}

test("hotkey mode: 'p' emits toggle_play", () => {
  const ev = collect("hotkey", [{ name: "p" }]);
  assert.deepStrictEqual(ev, [{ kind: "hotkey", action: "toggle_play" }]);
});

test("hotkey mode: '/' emits focus_search", () => {
  const ev = collect("hotkey", [{ name: "/" }]);
  assert.deepStrictEqual(ev, [{ kind: "hotkey", action: "focus_search" }]);
});

test("text mode: 'p' emits text event (not a hotkey)", () => {
  const ev = collect("text", [{ name: "p", sequence: "p" }]);
  assert.deepStrictEqual(ev, [{ kind: "text", char: "p" }]);
});

test("text mode: backspace emits edit", () => {
  const ev = collect("text", [{ name: "backspace" }]);
  assert.deepStrictEqual(ev, [{ kind: "edit", op: "backspace" }]);
});

test("text mode: up/down emit nav", () => {
  const ev = collect("text", [{ name: "up" }, { name: "down" }]);
  assert.deepStrictEqual(ev, [
    { kind: "nav", dir: "up" },
    { kind: "nav", dir: "down" },
  ]);
});

test("ctrl-c always emits quit regardless of mode", () => {
  const h = collect("hotkey", [{ name: "c", ctrl: true }]);
  const t = collect("text", [{ name: "c", ctrl: true }]);
  assert.deepStrictEqual(h, [{ kind: "quit" }]);
  assert.deepStrictEqual(t, [{ kind: "quit" }]);
});
```

- [ ] **Step 2: Rewrite input.ts**

Replace `src/ui/input.ts` with:

```ts
import readline from "readline";

export type HotkeyAction =
  | "quit"
  | "toggle_play"
  | "next"
  | "prev"
  | "mute"
  | "cycle_palette"
  | "toggle_art"
  | "focus_search";

export type InputEvent =
  | { kind: "hotkey"; action: HotkeyAction }
  | { kind: "text"; char: string }
  | { kind: "edit"; op: "backspace" | "enter" | "escape" }
  | { kind: "nav"; dir: "up" | "down" | "left" | "right" }
  | { kind: "quit" };

export type InputMode = "hotkey" | "text";

type Key = { name?: string; sequence?: string; ctrl?: boolean };

const HOTKEYS: Record<string, HotkeyAction> = {
  "q":  "quit",
  "p":  "toggle_play",
  "n":  "next",
  "b":  "prev",
  "m":  "mute",
  "v":  "cycle_palette",
  "a":  "toggle_art",
  "/":  "focus_search",
};

export function dispatchKey(
  getMode: () => InputMode,
  emit: (e: InputEvent) => void,
  key: Key,
): void {
  if (key.ctrl && key.name === "c") { emit({ kind: "quit" }); return; }
  const mode = getMode();
  if (mode === "hotkey") {
    const name = key.name ?? key.sequence ?? "";
    const act = HOTKEYS[name];
    if (act) emit({ kind: "hotkey", action: act });
    return;
  }
  // text mode
  switch (key.name) {
    case "backspace": emit({ kind: "edit", op: "backspace" }); return;
    case "return":    emit({ kind: "edit", op: "enter" }); return;
    case "escape":    emit({ kind: "edit", op: "escape" }); return;
    case "up":        emit({ kind: "nav", dir: "up" }); return;
    case "down":      emit({ kind: "nav", dir: "down" }); return;
    case "left":      emit({ kind: "nav", dir: "left" }); return;
    case "right":     emit({ kind: "nav", dir: "right" }); return;
  }
  const ch = key.sequence && key.sequence.length === 1 ? key.sequence : "";
  if (ch && ch >= " " && ch <= "~") emit({ kind: "text", char: ch });
}

let _installed = false;

export function startInput(
  getMode: () => InputMode,
  emit: (e: InputEvent) => void,
): void {
  if (_installed) return;
  _installed = true;
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) process.stdin.setRawMode(true);
  process.stdin.on("keypress", (_s: string, key: Key) => dispatchKey(getMode, emit, key));
}

export function stopInput(): void {
  if (!_installed) return;
  _installed = false;
  if (process.stdin.isTTY) process.stdin.setRawMode(false);
  process.stdin.removeAllListeners("keypress");
}
```

- [ ] **Step 3: Update callers temporarily (will be deleted later)**

Run: `grep -rn "startInput\|Action" src/visualizer/ src/cli/ 2>&1 | head`

If any `.ts` file in `src/` imports the old `Action` type or calls `startInput(handler)` with a single callback, it'll fail compilation. Since those files (in `src/visualizer/`) are slated for deletion in Task 26, the simplest fix: continue; the break is noise until deletion. BUT if the project is currently wired so `src/cli/commands/visualizer.ts` boots the old engine, we need the build to still work.

Pragmatic fix: leave `src/visualizer/` alone until Task 26. If build breaks, add `// @ts-nocheck` at the top of the offending old files until they're deleted. Never ship `@ts-nocheck` — we delete these files in Task 26 anyway.

Run: `npm run build`
If it fails on a file we're about to delete, add `// @ts-nocheck` at the top of that file only and commit the suppression as part of the next step.

- [ ] **Step 4: Run tests**

Run: `npm run build && node --test dist/ui/input.test.js`
Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/ui/input.ts src/ui/input.test.ts src/visualizer
git commit -m "refactor(input): two-mode event emitter (hotkey/text)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Phase 7 — Widgets (pure render functions)

Every widget in this phase has the same shape. We'll write tests using `Renderer.debugLines()` to assert substrings appear in expected rows. Pattern per widget:
- Create `src/player/widgets/<name>.ts` with a single exported function
- Create `src/player/widgets/<name>.test.ts` asserting specific output
- Commit

### Task 13: `titleBar` widget

**Files:**
- Create: `src/player/widgets/titleBar.ts`
- Test:   `src/player/widgets/titleBar.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/player/widgets/titleBar.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert";
import { Renderer } from "../../ui/renderer.js";
import { renderTitleBar } from "./titleBar.js";
import { createInitialState } from "../state.js";
import { buildTheme } from "../theme.js";
import { computeAppLayout } from "../layout.js";

test("titleBar renders brand, search placeholder, and SYS.LOAD", () => {
  const r = new Renderer(120, 40);
  const s = createInitialState(120, 40);
  s.cpuPct = 1.2;
  const t = buildTheme(0, true);
  const L = computeAppLayout(120, 40);
  renderTitleBar(r, L, s, t);
  const line = r.debugLines()[L.titleBar.y];
  assert.ok(line.includes("[ TUI.AMP v4.0 ]"), "expected brand");
  assert.ok(line.includes("SYS.LOAD:"), "expected SYS.LOAD label");
  assert.ok(line.includes("1.2%"), "expected cpu value");
});

test("titleBar shows search query when focused", () => {
  const r = new Renderer(120, 40);
  const s = createInitialState(120, 40);
  s.search.focused = true;
  s.search.query = "justice";
  const L = computeAppLayout(120, 40);
  renderTitleBar(r, L, s, buildTheme(0, true));
  const line = r.debugLines()[L.titleBar.y];
  assert.ok(line.includes("justice"));
  assert.ok(line.includes(">"), "expected search prompt marker");
});
```

- [ ] **Step 2: Verify failing**

Run: `npm run build 2>&1 | head -5`

- [ ] **Step 3: Implement titleBar.ts**

Create `src/player/widgets/titleBar.ts`:

```ts
import type { Renderer } from "../../ui/renderer.js";
import type { AppState } from "../state.js";
import type { Theme } from "../theme.js";
import type { AppLayout } from "../layout.js";

export function renderTitleBar(
  r: Renderer,
  L: AppLayout,
  state: AppState,
  theme: Theme,
): void {
  const brand = "[ TUI.AMP v4.0 ]";
  r.write(L.brandR.x, L.brandR.y, `${theme.accent}${brand}${theme.reset}`);

  const sx = L.searchR.x;
  const sy = L.searchR.y;
  const sw = L.searchR.width;
  if (sw > 4) {
    if (state.search.focused) {
      const prefix = "> ";
      const visible = state.search.query.slice(-(sw - prefix.length - 1));
      r.write(sx + 1, sy, `${theme.fg}${prefix}${visible}${theme.reset}`);
    } else {
      const hint = "(press / to search)";
      if (hint.length + 2 <= sw) {
        r.write(sx + 1, sy, `${theme.dim}${hint}${theme.reset}`);
      }
    }
  }

  const cpu = state.cpuPct.toFixed(1).padStart(4, " ");
  const right = `SYS.LOAD: ${cpu}%`;
  const rx = L.sysLoadR.x + Math.max(0, L.sysLoadR.width - right.length);
  r.write(rx, L.sysLoadR.y, `${theme.dim}${right}${theme.reset}`);
}
```

- [ ] **Step 4: Run tests**

Run: `npm run build && node --test dist/player/widgets/titleBar.test.js`
Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/player/widgets/titleBar.ts src/player/widgets/titleBar.test.ts
git commit -m "feat(widgets): titleBar with brand, search, SYS.LOAD

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 14: `nowPlaying` widget with L/R meter

**Files:**
- Create: `src/player/widgets/nowPlaying.ts`
- Test:   `src/player/widgets/nowPlaying.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/player/widgets/nowPlaying.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert";
import { Renderer } from "../../ui/renderer.js";
import { renderNowPlaying } from "./nowPlaying.js";
import { createInitialState } from "../state.js";
import { buildTheme } from "../theme.js";

test("nowPlaying renders placeholder when no track", () => {
  const r = new Renderer(60, 20);
  const s = createInitialState(60, 20);
  renderNowPlaying(r, { x: 0, y: 0, width: 60, height: 10 }, s, buildTheme(0, true));
  const lines = r.debugLines();
  assert.ok(lines[1].includes("— no track —") || lines[2].includes("— no track —"));
});

test("nowPlaying shows title, artist, album, and meter labels", () => {
  const r = new Renderer(60, 20);
  const s = createInitialState(60, 20);
  s.nowPlaying = {
    trackName: "D.A.N.C.E.", artistName: "Justice", albumName: "Cross",
    albumArtUrl: "", deviceName: "Spotify", isPlaying: true,
    progressMs: 0, durationMs: 0,
  };
  s.meterL = 0.8; s.meterR = 0.8;
  renderNowPlaying(r, { x: 0, y: 0, width: 60, height: 10 }, s, buildTheme(0, true));
  const joined = r.debugLines().join("\n");
  assert.match(joined, /TITLE:\s+D\.A\.N\.C\.E\./);
  assert.match(joined, /ARTIST:\s+Justice/);
  assert.match(joined, /ALBUM:\s+Cross/);
  assert.match(joined, /MASTER OUT/);
  assert.match(joined, /L \[/);
  assert.match(joined, /R \[/);
});
```

- [ ] **Step 2: Verify failing**

Run: `npm run build 2>&1 | head -5`

- [ ] **Step 3: Implement nowPlaying.ts**

Create `src/player/widgets/nowPlaying.ts`:

```ts
import type { Renderer } from "../../ui/renderer.js";
import type { Region } from "../../ui/tui.js";
import type { AppState } from "../state.js";
import type { Theme } from "../theme.js";

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, Math.max(0, max - 1)) + "…";
}

function gradientBar(level: number, width: number): string {
  const clamped = Math.max(0, Math.min(1, level));
  const fill = Math.round(clamped * width);
  let out = "";
  for (let i = 0; i < width; i++) {
    if (i < fill - 2) out += "\u2588";         // █
    else if (i < fill - 1) out += "\u2593";    // ▓
    else if (i < fill) out += "\u2592";        // ▒
    else out += "\u2591";                      // ░
  }
  return out;
}

const LABEL = "NOW PLAYING";

export function renderNowPlaying(
  r: Renderer,
  region: Region,
  state: AppState,
  theme: Theme,
): void {
  if (region.width < 16 || region.height < 5) return;
  const xi = region.x + 2;
  r.write(xi, region.y, `${theme.dim}${LABEL}${theme.reset}`);

  if (!state.nowPlaying) {
    r.write(xi, region.y + 2, `${theme.dim}— no track —${theme.reset}`);
    return;
  }
  const np = state.nowPlaying;
  const pad = region.width - 4;
  r.write(xi, region.y + 2, `${theme.fg}TITLE:  ${truncate(np.trackName, pad - 8)}${theme.reset}`);
  r.write(xi, region.y + 3, `${theme.fg}ARTIST: ${truncate(np.artistName, pad - 8)}${theme.reset}`);
  r.write(xi, region.y + 4, `${theme.fg}ALBUM:  ${truncate(np.albumName, pad - 8)}${theme.reset}`);
  r.write(xi, region.y + 5, `${theme.dim}FMT:    stream ${(Math.round((np.durationMs || 0) / 1000))}s${theme.reset}`);

  if (region.height >= 9) {
    r.write(xi, region.y + 7, `${theme.dim}MASTER OUT${theme.reset}`);
    const barW = Math.max(4, pad - 5);
    r.write(xi, region.y + 8, `${theme.meter}L [${gradientBar(state.meterL, barW)}]${theme.reset}`);
    if (region.height >= 10) {
      r.write(xi, region.y + 9, `${theme.meter}R [${gradientBar(state.meterR, barW)}]${theme.reset}`);
    }
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npm run build && node --test dist/player/widgets/nowPlaying.test.js`
Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/player/widgets/nowPlaying.ts src/player/widgets/nowPlaying.test.ts
git commit -m "feat(widgets): nowPlaying with L/R master meter

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 15: `recentlyPlayed` widget

**Files:**
- Create: `src/player/widgets/recentlyPlayed.ts`
- Test:   `src/player/widgets/recentlyPlayed.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/player/widgets/recentlyPlayed.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert";
import { Renderer } from "../../ui/renderer.js";
import { renderRecentlyPlayed } from "./recentlyPlayed.js";
import { createInitialState, pushRecentlyPlayed } from "../state.js";
import { buildTheme } from "../theme.js";

const t = (n: string) => ({
  trackName: n, artistName: "x", albumName: "x", albumArtUrl: "",
  deviceName: "Spotify", isPlaying: true, progressMs: 0, durationMs: 0,
});

test("recentlyPlayed shows label", () => {
  const r = new Renderer(40, 12);
  const s = createInitialState(40, 12);
  renderRecentlyPlayed(r, { x: 0, y: 0, width: 40, height: 10 }, s, buildTheme(0, true));
  assert.ok(r.debugLines().join("\n").includes("RECENTLY PLAYED"));
});

test("recentlyPlayed lists track names with > prefix", () => {
  const r = new Renderer(40, 12);
  const s = createInitialState(40, 12);
  pushRecentlyPlayed(s, t("Genesis"));
  pushRecentlyPlayed(s, t("Phantom"));
  renderRecentlyPlayed(r, { x: 0, y: 0, width: 40, height: 10 }, s, buildTheme(0, true));
  const all = r.debugLines().join("\n");
  assert.match(all, />\s*Phantom/);
  assert.match(all, />\s*Genesis/);
});
```

- [ ] **Step 2: Verify failing**

Run: `npm run build 2>&1 | head -5`

- [ ] **Step 3: Implement recentlyPlayed.ts**

Create `src/player/widgets/recentlyPlayed.ts`:

```ts
import type { Renderer } from "../../ui/renderer.js";
import type { Region } from "../../ui/tui.js";
import type { AppState } from "../state.js";
import type { Theme } from "../theme.js";

const LABEL = "RECENTLY PLAYED";

export function renderRecentlyPlayed(
  r: Renderer,
  region: Region,
  state: AppState,
  theme: Theme,
): void {
  if (region.width < 10) return;
  const xi = region.x + 2;
  r.write(xi, region.y, `${theme.dim}${LABEL}${theme.reset}`);
  const maxRows = Math.min(8, region.height - 2);
  const itemW = region.width - 4;
  for (let i = 0; i < maxRows; i++) {
    const entry = state.recentlyPlayed[i];
    const line = entry ? `> ${entry.trackName}` : "";
    const truncated = line.length > itemW ? line.slice(0, itemW - 1) + "…" : line;
    r.write(xi, region.y + 2 + i, `${theme.fg}${truncated}${theme.reset}`);
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npm run build && node --test dist/player/widgets/recentlyPlayed.test.js`
Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/player/widgets/recentlyPlayed.ts src/player/widgets/recentlyPlayed.test.ts
git commit -m "feat(widgets): recentlyPlayed list

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 16: `albumArt` widget

**Files:**
- Create: `src/player/widgets/albumArt.ts`
- Test:   `src/player/widgets/albumArt.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/player/widgets/albumArt.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert";
import { Renderer } from "../../ui/renderer.js";
import { renderAlbumArt } from "./albumArt.js";
import { createInitialState } from "../state.js";
import { buildTheme } from "../theme.js";

test("albumArt shows label in blank mode", () => {
  const r = new Renderer(40, 10);
  const s = createInitialState(40, 10);
  s.artCellMode = "blank";
  renderAlbumArt(r, { x: 0, y: 0, width: 40, height: 10 }, s, buildTheme(0, true));
  assert.ok(r.debugLines().join("\n").includes("ALBUM ART"));
});

test("albumArt renders provided AsciiArt lines in art mode", () => {
  const r = new Renderer(40, 10);
  const s = createInitialState(40, 10);
  s.artCellMode = "art";
  s.albumArt = {
    trackId: "x", thumbnail: [], lines: ["AAAAA", "BBBBB"],
    fullCols: 5, fullRows: 2, playerLines: [], playerCols: 0, playerRows: 0,
    cols: 40, rows: 10,
  };
  renderAlbumArt(r, { x: 0, y: 0, width: 40, height: 10 }, s, buildTheme(0, true));
  const lines = r.debugLines();
  assert.ok(lines.some((l) => l.includes("AAAAA")));
  assert.ok(lines.some((l) => l.includes("BBBBB")));
});
```

- [ ] **Step 2: Verify failing**

Run: `npm run build 2>&1 | head -5`

- [ ] **Step 3: Implement albumArt.ts**

Create `src/player/widgets/albumArt.ts`:

```ts
import type { Renderer } from "../../ui/renderer.js";
import type { Region } from "../../ui/tui.js";
import type { AppState } from "../state.js";
import type { Theme } from "../theme.js";

const LABEL = "ALBUM ART";

export function renderAlbumArt(
  r: Renderer,
  region: Region,
  state: AppState,
  theme: Theme,
): void {
  const xi = region.x + 2;
  r.write(xi, region.y, `${theme.dim}${LABEL}${theme.reset}`);

  const artY = region.y + 2;
  const artX = region.x + 2;
  const artW = region.width - 4;
  const artH = region.height - 3;
  if (artW <= 0 || artH <= 0) return;

  if (state.artCellMode === "blank") {
    const msg = "[ OFF ]";
    const cx = region.x + Math.floor((region.width - msg.length) / 2);
    const cy = region.y + Math.floor(region.height / 2);
    r.write(cx, cy, `${theme.dim}${msg}${theme.reset}`);
    return;
  }

  if (state.artCellMode === "vu") {
    const bars = Math.max(1, artW);
    const lvl = Math.round((state.meterL + state.meterR) / 2 * artH);
    for (let row = 0; row < artH; row++) {
      const y = artY + artH - 1 - row;
      const ch = row < lvl ? "\u2588".repeat(bars) : " ".repeat(bars);
      r.write(artX, y, `${theme.meter}${ch}${theme.reset}`);
    }
    return;
  }

  const art = state.albumArt;
  if (!art) {
    const msg = "— no art —";
    const cx = region.x + Math.floor((region.width - msg.length) / 2);
    const cy = region.y + Math.floor(region.height / 2);
    r.write(cx, cy, `${theme.dim}${msg}${theme.reset}`);
    return;
  }
  const lines = art.lines;
  for (let i = 0; i < Math.min(artH, lines.length); i++) {
    r.write(artX, artY + i, lines[i]);
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npm run build && node --test dist/player/widgets/albumArt.test.js`
Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/player/widgets/albumArt.ts src/player/widgets/albumArt.test.ts
git commit -m "feat(widgets): albumArt with art/vu/blank modes

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 17: `spectrum` widget

**Files:**
- Create: `src/player/widgets/spectrum.ts`
- Test:   `src/player/widgets/spectrum.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/player/widgets/spectrum.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert";
import { Renderer } from "../../ui/renderer.js";
import { renderSpectrum } from "./spectrum.js";
import { createInitialState } from "../state.js";
import { buildTheme } from "../theme.js";

test("spectrum renders label", () => {
  const r = new Renderer(60, 20);
  const s = createInitialState(60, 20);
  renderSpectrum(r, { x: 0, y: 0, width: 60, height: 20 }, s, buildTheme(0, true));
  assert.ok(r.debugLines().join("\n").includes("SPECTRUM ANALYZER"));
});

test("spectrum draws full bar for magnitude 1.0 and empty for 0.0", () => {
  const r = new Renderer(60, 20);
  const s = createInitialState(60, 20);
  s.spectrum = new Float32Array(16);
  s.spectrum[0] = 1.0;
  renderSpectrum(r, { x: 0, y: 0, width: 60, height: 20 }, s, buildTheme(0, true));
  // The first bucket should have filled cells near the bottom of the region
  const lines = r.debugLines();
  const bottom = lines[17];  // just above the region's bottom
  assert.ok(bottom.includes("\u2588"), "expected at least one full-block glyph on filled bar row");
});
```

- [ ] **Step 2: Verify failing**

Run: `npm run build 2>&1 | head -5`

- [ ] **Step 3: Implement spectrum.ts**

Create `src/player/widgets/spectrum.ts`:

```ts
import type { Renderer } from "../../ui/renderer.js";
import type { Region } from "../../ui/tui.js";
import type { AppState } from "../state.js";
import type { Theme } from "../theme.js";

const LABEL = "SPECTRUM ANALYZER // 16-BAND";
const NUM_BARS = 16;

export function renderSpectrum(
  r: Renderer,
  region: Region,
  state: AppState,
  theme: Theme,
): void {
  if (region.width < 20 || region.height < 5) return;
  const xi = region.x + 2;
  r.write(xi, region.y, `${theme.dim}[ ${LABEL} ]${theme.reset}`);

  const plotY = region.y + 2;
  const plotH = region.height - 3;
  const plotX = region.x + 2;
  const plotW = region.width - 4;

  // Each bar occupies floor(plotW / NUM_BARS) columns; gap between bars = 0
  const barW = Math.max(1, Math.floor(plotW / NUM_BARS));
  for (let b = 0; b < NUM_BARS; b++) {
    const mag = Math.max(0, Math.min(1, state.spectrum[b] ?? 0));
    // 2 sub-rows per cell using ▀ / █ gives 2x vertical resolution.
    const totalHalfRows = Math.round(mag * plotH * 2);
    const full = Math.floor(totalHalfRows / 2);
    const half = totalHalfRows % 2;
    const xStart = plotX + b * barW;
    const color = theme.spectrum[b];
    for (let i = 0; i < full; i++) {
      const y = plotY + plotH - 1 - i;
      r.write(xStart, y, `${color}${"\u2588".repeat(barW)}${theme.reset}`);
    }
    if (half > 0) {
      const y = plotY + plotH - 1 - full;
      r.write(xStart, y, `${color}${"\u2584".repeat(barW)}${theme.reset}`);
    }
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npm run build && node --test dist/player/widgets/spectrum.test.js`
Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/player/widgets/spectrum.ts src/player/widgets/spectrum.test.ts
git commit -m "feat(widgets): 16-band spectrum analyzer

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 18: `lyrics` widget with 8×6 FIGlet on peak

**Files:**
- Create: `src/player/widgets/lyrics.ts`
- Test:   `src/player/widgets/lyrics.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/player/widgets/lyrics.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert";
import { Renderer } from "../../ui/renderer.js";
import { renderLyrics } from "./lyrics.js";
import { createInitialState } from "../state.js";
import { buildTheme } from "../theme.js";

test("lyrics shows label and low-energy line as plain text", () => {
  const r = new Renderer(60, 20);
  const s = createInitialState(60, 20);
  s.lyrics = [{ timeMs: 0, text: "Do the dance" }, { timeMs: 5000, text: "Bounce" }];
  s.activeLyricIndex = 0;
  s.transientEnergy = 0.1;
  renderLyrics(r, { x: 0, y: 0, width: 60, height: 16 }, s, buildTheme(0, true));
  const joined = r.debugLines().join("\n");
  assert.match(joined, /KINETIC LYRICS/);
  assert.match(joined, /Do the dance/);
});

test("lyrics renders active line as big-font glyphs when energy > 0.6", () => {
  const r = new Renderer(60, 20);
  const s = createInitialState(60, 20);
  s.lyrics = [{ timeMs: 0, text: "BOUNCE" }];
  s.activeLyricIndex = 0;
  s.transientEnergy = 0.9;
  renderLyrics(r, { x: 0, y: 0, width: 60, height: 16 }, s, buildTheme(0, true));
  const joined = r.debugLines().join("\n");
  assert.ok(joined.includes("\u2588"), "expected block glyphs for FIGlet rendering");
  assert.match(joined, /TRANSIENT PEAK/);
});
```

- [ ] **Step 2: Verify failing**

Run: `npm run build 2>&1 | head -5`

- [ ] **Step 3: Implement lyrics.ts**

Create `src/player/widgets/lyrics.ts`:

```ts
import type { Renderer } from "../../ui/renderer.js";
import type { Region } from "../../ui/tui.js";
import type { AppState } from "../state.js";
import type { Theme } from "../theme.js";
import { renderBigLine, GLYPH_H } from "../../ui/bitfont.js";

const LABEL_PLAIN = "[ KINETIC LYRICS // SYNC: RMS ]";
const LABEL_PEAK  = "[ TRANSIENT PEAK -> FONT-SCALE MAX ]";
const BIG_THRESHOLD = 0.6;

export function renderLyrics(
  r: Renderer,
  region: Region,
  state: AppState,
  theme: Theme,
): void {
  if (region.width < 20 || region.height < 6) return;
  const xi = region.x + 2;
  const big = state.transientEnergy >= BIG_THRESHOLD;
  r.write(xi, region.y, `${theme.dim}${big ? LABEL_PEAK : LABEL_PLAIN}${theme.reset}`);

  const active = state.lyrics[state.activeLyricIndex];
  const prev = state.lyrics[state.activeLyricIndex - 1];
  const next = state.lyrics[state.activeLyricIndex + 1];

  const bodyY = region.y + 2;
  const bodyW = region.width - 4;

  if (prev) r.write(xi, bodyY, `${theme.dim}${clip(prev.text, bodyW)}${theme.reset}`);
  if (next) r.write(xi, bodyY + Math.min(region.height - 4, 1 + (big ? GLYPH_H : 1)), `${theme.dim}${clip(next.text, bodyW)}${theme.reset}`);

  if (!active) return;
  if (big) {
    const rows = renderBigLine(active.text);
    for (let i = 0; i < Math.min(GLYPH_H, region.height - 5); i++) {
      r.write(xi, bodyY + 1 + i, `${theme.fg}${clip(rows[i], bodyW)}${theme.reset}`);
    }
  } else {
    r.write(xi, bodyY + 1, `${theme.fg}${clip(active.text, bodyW)}${theme.reset}`);
  }
}

function clip(s: string, w: number): string {
  return s.length <= w ? s : s.slice(0, Math.max(0, w - 1)) + "…";
}
```

- [ ] **Step 4: Run tests**

Run: `npm run build && node --test dist/player/widgets/lyrics.test.js`
Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/player/widgets/lyrics.ts src/player/widgets/lyrics.test.ts
git commit -m "feat(widgets): kinetic lyrics with 8x6 FIGlet on transient peak

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 19: `controls` widget (scrubber + hotkeys)

**Files:**
- Create: `src/player/widgets/controls.ts`
- Test:   `src/player/widgets/controls.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/player/widgets/controls.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert";
import { Renderer } from "../../ui/renderer.js";
import { renderControls } from "./controls.js";
import { createInitialState } from "../state.js";
import { buildTheme } from "../theme.js";
import { computeAppLayout } from "../layout.js";

test("controls renders timestamps and scrubber", () => {
  const r = new Renderer(120, 40);
  const s = createInitialState(120, 40);
  s.progressMs = 74_000;
  s.durationMs = 242_000;
  const L = computeAppLayout(120, 40);
  renderControls(r, L, s, buildTheme(0, true));
  const lines = r.debugLines();
  assert.match(lines[L.scrubR.y], /01:14/);
  assert.match(lines[L.scrubR.y], /04:02/);
});

test("controls renders hotkey legend", () => {
  const r = new Renderer(120, 40);
  const s = createInitialState(120, 40);
  const L = computeAppLayout(120, 40);
  renderControls(r, L, s, buildTheme(0, true));
  const line = r.debugLines()[L.keysR.y];
  assert.match(line, /\[p\] Play/);
  assert.match(line, /\[n\] Next/);
  assert.match(line, /\[q\] Quit/);
});
```

- [ ] **Step 2: Verify failing**

Run: `npm run build 2>&1 | head -5`

- [ ] **Step 3: Implement controls.ts**

Create `src/player/widgets/controls.ts`:

```ts
import type { Renderer } from "../../ui/renderer.js";
import type { AppState } from "../state.js";
import type { Theme } from "../theme.js";
import type { AppLayout } from "../layout.js";

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
  const x0 = L.scrubR.x + 2;
  const xLast = L.scrubR.x + L.scrubR.width - 2;
  r.write(x0, y, `${theme.fg}${left}${theme.reset}`);
  r.write(xLast - right.length + 1, y, `${theme.fg}${right}${theme.reset}`);
  const trackX0 = x0 + left.length + 1;
  const trackX1 = xLast - right.length - 1;
  const trackW = Math.max(0, trackX1 - trackX0);
  const pct = state.durationMs > 0 ? Math.min(1, state.progressMs / state.durationMs) : 0;
  const knobAt = trackX0 + Math.round(pct * trackW);
  for (let x = trackX0; x <= trackX1; x++) {
    r.write(x, y, `${theme.dim}\u2500${theme.reset}`);
  }
  r.write(knobAt, y, `${theme.accent}\u25CB${theme.reset}`);

  const legend = "[p] Play   [n] Next   [b] Back   [m] Mute   [v] Vis Mode   [a] Art Toggle   [/] Search   [q] Quit";
  r.write(L.keysR.x + 2, L.keysR.y, `${theme.dim}${legend.slice(0, L.keysR.width - 4)}${theme.reset}`);
}
```

- [ ] **Step 4: Run tests**

Run: `npm run build && node --test dist/player/widgets/controls.test.js`
Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/player/widgets/controls.ts src/player/widgets/controls.test.ts
git commit -m "feat(widgets): scrubber + hotkey legend

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Phase 8 — Feeders

### Task 20: `audioFeeder`

**Files:**
- Create: `src/player/feeders/audioFeeder.ts`

- [ ] **Step 1: Implement audioFeeder.ts**

Create `src/player/feeders/audioFeeder.ts`:

```ts
import type { AudioSource } from "../../audio/AudioSource.js";
import type { AppState } from "../state.js";
import { computeMagnitudeSpectrum } from "../../dsp/fft.js";
import { computeBuckets } from "../../dsp/buckets.js";
import { smoothBuckets, smoothValue, DEFAULT_BAR_SMOOTHING, DEFAULT_ENERGY_SMOOTHING } from "../../dsp/smoothing.js";
import { extractFeatures } from "../../dsp/features.js";
import { mixToMono } from "../../dsp/deinterleave.js";
import { extractChannelPeaks } from "../../dsp/channelPeaks.js";

const NUM_BARS = 16;
const ENERGY_DECAY_PER_FRAME = 0.04;  // ~half-life 150 ms at 60 FPS
const METER_SMOOTHING = 0.4;

export function startAudioFeeder(audio: AudioSource, state: AppState): void {
  const info = audio.getInfo();
  const peak = { value: 1e-6 };
  let prevBuckets = new Array<number>(NUM_BARS).fill(0);
  let prevRms = 0;

  audio.onFrame((interleaved) => {
    // Per-channel peaks
    const peaks = extractChannelPeaks(interleaved, info.numChannels);
    const l = peaks[0] ?? 0;
    const r = peaks[info.numChannels > 1 ? 1 : 0] ?? 0;
    state.meterL = smoothValue(state.meterL, l, METER_SMOOTHING);
    state.meterR = smoothValue(state.meterR, r, METER_SMOOTHING);

    // Mono mix → spectrum
    const mono = mixToMono(interleaved, info.numChannels);
    const spec = computeMagnitudeSpectrum(mono);
    const raw = computeBuckets(spec, NUM_BARS, info.sampleRate);
    const smoothed = smoothBuckets(prevBuckets, raw, DEFAULT_BAR_SMOOTHING);
    prevBuckets = smoothed.slice();
    for (let i = 0; i < NUM_BARS; i++) state.spectrum[i] = smoothed[i];

    const f = extractFeatures(mono, peak);
    state.rms = smoothValue(prevRms, f.rms, DEFAULT_ENERGY_SMOOTHING);
    prevRms = state.rms;
    state.transientPeak = f.transient;
    state.transientEnergy = f.transient
      ? 1.0
      : Math.max(0, state.transientEnergy - ENERGY_DECAY_PER_FRAME);
  });
}
```

- [ ] **Step 2: Type-check**

Run: `npm run build`
If `computeBuckets` / `computeMagnitudeSpectrum` / `extractFeatures` have different signatures than assumed, read their `.ts` files in `src/dsp/` and adapt the call-sites. Do NOT change the DSP files themselves.

- [ ] **Step 3: Commit**

```bash
git add src/player/feeders/audioFeeder.ts
git commit -m "feat(feeders): audioFeeder drives spectrum, L/R meter, transient energy

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 21: `spotifyFeeder` + album-art + lyrics feeders

**Files:**
- Create: `src/player/feeders/spotifyFeeder.ts`
- Create: `src/player/feeders/albumArtFeeder.ts`
- Create: `src/player/feeders/lyricsFeeder.ts`

- [ ] **Step 1: Implement spotifyFeeder.ts**

Create `src/player/feeders/spotifyFeeder.ts`:

```ts
import * as spotifyDesktop from "../../macos/spotifyDesktop.js";
import type { AppState } from "../state.js";
import { pushRecentlyPlayed } from "../state.js";

type TrackChangedCallback = (trackName: string, artistName: string, albumArtUrl: string) => void;

export function startSpotifyFeeder(
  state: AppState,
  onTrackChanged: TrackChangedCallback,
): () => void {
  let inFlight = false;
  let lastKey = "";

  const tick = async () => {
    if (inFlight) return;
    inFlight = true;
    try {
      const s = await spotifyDesktop.getState();
      if (!s) {
        state.nowPlaying = null;
        state.isPlaying = false;
        return;
      }
      state.nowPlaying = s;
      state.isPlaying = s.isPlaying;
      state.progressMs = s.progressMs;
      state.durationMs = s.durationMs;
      state.lastSpotifyPollAt = Date.now();

      const key = `${s.trackName}\u0000${s.artistName}`;
      if (key !== lastKey) {
        lastKey = key;
        pushRecentlyPlayed(state, s);
        onTrackChanged(s.trackName, s.artistName, s.albumArtUrl);
      }
    } catch {
      state.nowPlaying = null;
    } finally {
      inFlight = false;
    }
  };

  const id = setInterval(tick, 1000);
  // Fire once immediately
  void tick();
  return () => clearInterval(id);
}
```

- [ ] **Step 2: Implement albumArtFeeder.ts**

Create `src/player/feeders/albumArtFeeder.ts`:

```ts
import { fetchImageBuffer } from "../../album/fetcher.js";
import { convertToAscii } from "../../album/converter.js";
import { getCached, setCached } from "../../album/cache.js";
import type { AppState } from "../state.js";

export async function fetchAlbumArt(
  state: AppState,
  url: string,
  cellCols: number,
  cellRows: number,
  noColor: boolean,
): Promise<void> {
  if (!url) { state.albumArt = null; return; }
  const cacheKey = `${url}::${cellCols}x${cellRows}::${noColor ? "mono" : "color"}`;
  const cached = getCached(cacheKey);
  if (cached) { state.albumArt = cached; return; }
  try {
    const buf = await fetchImageBuffer(url);
    const art = await convertToAscii(buf, cacheKey, cellCols * 2, cellRows * 2, noColor);
    setCached(cacheKey, art);
    state.albumArt = art;
  } catch {
    state.albumArt = null;
  }
}
```

Note: the call passes `cellCols * 2, cellRows * 2` because `convertToAscii`'s existing "vizCols/vizRows" interpretation scales the `fullCols/fullRows` down by ~48% internally. If inspection of `convertToAscii` shows a different scaling behaviour, adjust to request the exact cell dimensions we need.

- [ ] **Step 3: Implement lyricsFeeder.ts**

Create `src/player/feeders/lyricsFeeder.ts`:

```ts
import { fetchLyrics, activeLyricIndex } from "../../lyrics/lrclib.js";
import type { AppState, LrcLine } from "../state.js";

const cache = new Map<string, LrcLine[]>();

export async function fetchLyricsFor(state: AppState, title: string, artist: string): Promise<void> {
  const key = `${artist}::${title}`;
  if (cache.has(key)) { state.lyrics = cache.get(key)!; state.activeLyricIndex = -1; return; }
  try {
    const raw = await fetchLyrics(title, artist);
    const lines: LrcLine[] = (raw ?? []).map((ln: { timeMs: number; text: string }) => ({
      timeMs: ln.timeMs, text: ln.text,
    }));
    cache.set(key, lines);
    state.lyrics = lines;
    state.activeLyricIndex = -1;
  } catch {
    state.lyrics = [];
    state.activeLyricIndex = -1;
  }
}

export function updateActiveLyric(state: AppState): void {
  if (state.lyrics.length === 0) { state.activeLyricIndex = -1; return; }
  state.activeLyricIndex = activeLyricIndex(state.progressMs, state.lyrics);
}
```

If `fetchLyrics` / `activeLyricIndex` have different names or signatures in `src/lyrics/lrclib.ts`, read that file and adapt.

- [ ] **Step 4: Type-check**

Run: `npm run build`
Expected: compiles. Fix signature mismatches by reading source DSP/lyrics files and adjusting the feeder to match.

- [ ] **Step 5: Commit**

```bash
git add src/player/feeders/spotifyFeeder.ts src/player/feeders/albumArtFeeder.ts src/player/feeders/lyricsFeeder.ts
git commit -m "feat(feeders): spotify polling, album-art fetch, lyrics fetch

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 22: `cpuFeeder`

**Files:**
- Create: `src/player/feeders/cpuFeeder.ts`

- [ ] **Step 1: Implement cpuFeeder.ts**

Create `src/player/feeders/cpuFeeder.ts`:

```ts
import { performance } from "node:perf_hooks";
import type { AppState } from "../state.js";

export function startCpuFeeder(state: AppState): () => void {
  let prev = process.cpuUsage();
  let prevT = performance.now();
  const id = setInterval(() => {
    const d = process.cpuUsage(prev);
    const now = performance.now();
    const elapsedUs = (now - prevT) * 1000;
    const cpuUs = d.user + d.system;
    const raw = elapsedUs > 0 ? (cpuUs / elapsedUs) * 100 : 0;
    const clamped = Math.max(0, Math.min(999, raw));
    state.cpuPct = state.cpuPct * 0.7 + clamped * 0.3;
    prev = process.cpuUsage();
    prevT = now;
  }, 1000);
  return () => clearInterval(id);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/player/feeders/cpuFeeder.ts
git commit -m "feat(feeders): 1 Hz CPU load sampler

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Phase 9 — App.ts assembly + CLI wiring

### Task 23: Main `App` class

**Files:**
- Create: `src/player/App.ts`

- [ ] **Step 1: Implement App.ts**

Create `src/player/App.ts`:

```ts
import { Renderer } from "../ui/renderer.js";
import { buildTheme, PALETTE_COUNT } from "./theme.js";
import { drawOuterFrame, drawHSeparator, drawVDivider } from "../ui/borders.js";
import { computeAppLayout, MIN_COLS, MIN_ROWS } from "./layout.js";
import { createInitialState, type AppState } from "./state.js";
import { enterAlternateScreen, exitAlternateScreen, getTerminalSize } from "../ui/AppScreen.js";
import { startInput, stopInput, type InputEvent } from "../ui/input.js";
import type { AudioSource } from "../audio/AudioSource.js";
import { startAudioFeeder } from "./feeders/audioFeeder.js";
import { startSpotifyFeeder } from "./feeders/spotifyFeeder.js";
import { startCpuFeeder } from "./feeders/cpuFeeder.js";
import { fetchAlbumArt } from "./feeders/albumArtFeeder.js";
import { fetchLyricsFor, updateActiveLyric } from "./feeders/lyricsFeeder.js";
import * as spotifyDesktop from "../macos/spotifyDesktop.js";
import { searchTracks } from "./search/spotifyWebApi.js";

import { renderTitleBar } from "./widgets/titleBar.js";
import { renderAlbumArt } from "./widgets/albumArt.js";
import { renderNowPlaying } from "./widgets/nowPlaying.js";
import { renderRecentlyPlayed } from "./widgets/recentlyPlayed.js";
import { renderLyrics } from "./widgets/lyrics.js";
import { renderSpectrum } from "./widgets/spectrum.js";
import { renderControls } from "./widgets/controls.js";

export interface AppOptions { audio: AudioSource; noColor: boolean; }

export class App {
  private state: AppState;
  private renderer!: Renderer;
  private running = false;
  private stopCpu: (() => void) | null = null;
  private stopSpotify: (() => void) | null = null;
  private searchDebounce: NodeJS.Timeout | null = null;
  private searchAbort: AbortController | null = null;
  private transportDebounceAt = 0;
  private readonly opts: AppOptions;

  constructor(opts: AppOptions) {
    this.opts = opts;
    const { cols, rows } = getTerminalSize();
    this.state = createInitialState(cols, rows);
  }

  async start(): Promise<void> {
    this.running = true;
    enterAlternateScreen();
    const { cols, rows } = getTerminalSize();
    this.renderer = new Renderer(cols, rows);

    process.stdout.on("resize", () => {
      const { cols: c, rows: r } = getTerminalSize();
      this.state.cols = c; this.state.rows = r;
      this.renderer.resize(c, r);
      this.renderer.invalidate();
    });

    // Feeders
    await this.opts.audio.start();
    startAudioFeeder(this.opts.audio, this.state);
    this.stopSpotify = startSpotifyFeeder(this.state, (title, artist, artUrl) => {
      const L = computeAppLayout(this.state.cols, this.state.rows);
      void fetchAlbumArt(this.state, artUrl, L.artR.width - 4, L.artR.height - 3, this.opts.noColor);
      void fetchLyricsFor(this.state, title, artist);
    });
    this.stopCpu = startCpuFeeder(this.state);

    // Input
    startInput(() => (this.state.search.focused ? "text" : "hotkey"), (e) => this.handleInput(e));

    // Render loop
    const frameMs = 1000 / 60;
    let last = performance.now();
    const tick = () => {
      if (!this.running) return;
      const now = performance.now();
      if (now - last >= frameMs) {
        last = now;
        this.renderFrame();
      }
      setImmediate(tick);
    };
    setImmediate(tick);
  }

  async stop(): Promise<void> {
    if (!this.running) return;
    this.running = false;
    stopInput();
    this.stopCpu?.();
    this.stopSpotify?.();
    await this.opts.audio.stop();
    exitAlternateScreen();
  }

  private renderFrame(): void {
    const L = computeAppLayout(this.state.cols, this.state.rows);
    this.renderer.clear();

    if (L.tooSmall) {
      const msg = `Terminal too small: ${this.state.cols}x${this.state.rows} (minimum ${MIN_COLS}x${MIN_ROWS})`;
      const x = Math.max(0, Math.floor((this.state.cols - msg.length) / 2));
      const y = Math.max(0, Math.floor(this.state.rows / 2));
      this.renderer.write(x, y, msg);
      this.renderer.flushDirty();
      return;
    }

    updateActiveLyric(this.state);
    // extrapolate progress between Spotify polls
    if (this.state.isPlaying && this.state.lastSpotifyPollAt > 0) {
      this.state.progressMs = Math.min(
        this.state.durationMs,
        this.state.progressMs + (performance.now() - (this.state.lastSpotifyPollAt - Date.now() + performance.now()))
      );
    }

    const theme = buildTheme(this.state.spectrumPaletteIndex, this.opts.noColor);

    // Borders
    drawOuterFrame(this.renderer);
    drawHSeparator(this.renderer, L.sep1Y, { down: L.sep1Down, up: [] });
    drawHSeparator(this.renderer, L.sep2Y, { down: L.sep2Down, up: L.sep2Up });
    drawHSeparator(this.renderer, L.sep3Y, { down: [], up: L.sep3Up });
    drawVDivider(this.renderer, L.sep1Down[0], L.topRow.y, L.topRow.y + L.topRow.height - 1);
    drawVDivider(this.renderer, L.sep1Down[1], L.topRow.y, L.topRow.y + L.topRow.height - 1);
    drawVDivider(this.renderer, L.sep2Down[0], L.middleRow.y, L.middleRow.y + L.middleRow.height - 1);

    // Widgets
    renderTitleBar(this.renderer, L, this.state, theme);
    renderAlbumArt(this.renderer, L.artR, this.state, theme);
    renderNowPlaying(this.renderer, L.nowR, this.state, theme);
    renderRecentlyPlayed(this.renderer, L.recentR, this.state, theme);
    renderLyrics(this.renderer, L.lyricsR, this.state, theme);
    renderSpectrum(this.renderer, L.spectrumR, this.state, theme);
    renderControls(this.renderer, L, this.state, theme);

    this.renderer.flushDirty();
  }

  private handleInput(e: InputEvent): void {
    if (e.kind === "quit") { void this.stop().then(() => process.exit(0)); return; }
    if (this.state.search.focused) {
      this.handleTextInput(e);
    } else {
      if (e.kind === "hotkey") this.handleHotkey(e.action);
    }
  }

  private handleHotkey(action: string): void {
    const now = Date.now();
    const transport = action === "toggle_play" || action === "next" || action === "prev" || action === "mute";
    if (transport && now - this.transportDebounceAt < 300) return;
    if (transport) this.transportDebounceAt = now;

    switch (action) {
      case "quit": void this.stop().then(() => process.exit(0)); return;
      case "toggle_play":
        void (this.state.isPlaying ? spotifyDesktop.pause() : spotifyDesktop.play()).catch(() => {});
        return;
      case "next": void spotifyDesktop.nextTrack().catch(() => {}); return;
      case "prev": void spotifyDesktop.previousTrack().catch(() => {}); return;
      case "mute": {
        const cmd = this.state.isMuted
          ? `set sound volume to ${this.state.savedVolume}`
          : `set sound volume to 0`;
        void (async () => {
          try {
            // Use the existing private tell() by calling pause/play analogs is not suitable.
            // Inline via execFile:
            const { execFile } = await import("node:child_process");
            const { promisify } = await import("node:util");
            const run = promisify(execFile);
            if (!this.state.isMuted) {
              const { stdout } = await run("/usr/bin/osascript", [
                "-e", 'tell application "Spotify" to get sound volume'
              ]);
              this.state.savedVolume = Math.max(1, parseInt(stdout.trim(), 10) || 50);
            }
            await run("/usr/bin/osascript", [
              "-e", 'tell application "Spotify" to ' + cmd
            ]);
            this.state.isMuted = !this.state.isMuted;
          } catch {}
        })();
        return;
      }
      case "cycle_palette":
        this.state.spectrumPaletteIndex = (this.state.spectrumPaletteIndex + 1) % PALETTE_COUNT;
        return;
      case "toggle_art": {
        const order: AppState["artCellMode"][] = ["art", "vu", "blank"];
        this.state.artCellMode = order[(order.indexOf(this.state.artCellMode) + 1) % order.length];
        return;
      }
      case "focus_search":
        this.state.search.focused = true;
        this.state.search.query = "";
        this.state.search.results = [];
        this.state.search.selectedIndex = 0;
        return;
    }
  }

  private handleTextInput(e: InputEvent): void {
    if (e.kind === "text") {
      this.state.search.query += e.char;
      this.scheduleSearch();
      return;
    }
    if (e.kind === "edit") {
      if (e.op === "backspace") {
        this.state.search.query = this.state.search.query.slice(0, -1);
        this.scheduleSearch();
      } else if (e.op === "enter") {
        const sel = this.state.search.results[this.state.search.selectedIndex];
        if (sel) void spotifyDesktop.playTrack(sel.uri).catch(() => {});
        this.closeSearch();
      } else if (e.op === "escape") {
        this.closeSearch();
      }
      return;
    }
    if (e.kind === "nav") {
      const n = this.state.search.results.length;
      if (n === 0) return;
      if (e.dir === "up") this.state.search.selectedIndex = (this.state.search.selectedIndex - 1 + n) % n;
      if (e.dir === "down") this.state.search.selectedIndex = (this.state.search.selectedIndex + 1) % n;
    }
  }

  private scheduleSearch(): void {
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchAbort?.abort();
    this.searchDebounce = setTimeout(async () => {
      const q = this.state.search.query;
      if (!q.trim()) { this.state.search.results = []; this.state.search.loading = false; return; }
      this.state.search.loading = true;
      this.searchAbort = new AbortController();
      try {
        const res = await searchTracks(q, this.searchAbort.signal);
        this.state.search.results = res;
        this.state.search.selectedIndex = 0;
        this.state.search.error = null;
      } catch (err: any) {
        this.state.search.error = err?.message ?? String(err);
        this.state.search.results = [];
      } finally {
        this.state.search.loading = false;
      }
    }, 180);
  }

  private closeSearch(): void {
    this.state.search.focused = false;
    this.state.search.query = "";
    this.state.search.results = [];
    this.state.search.selectedIndex = 0;
    this.searchAbort?.abort();
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
  }
}
```

- [ ] **Step 2: Type-check**

Run: `npm run build`
Expected: compiles. Any signature mismatches (e.g., `activeLyricIndex`, `extractFeatures`) require reading the DSP file and updating the feeder call-sites — not the DSP itself.

- [ ] **Step 3: Commit**

```bash
git add src/player/App.ts
git commit -m "feat(player): App assembly — tick loop, widgets, feeders, input

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 24: Wire App into CLI

**Files:**
- Modify: `src/cli/commands/visualizer.ts`

- [ ] **Step 1: Read the current visualizer command**

Read `src/cli/commands/visualizer.ts` fully. It currently instantiates `VisualizerEngine` from `src/visualizer/engine.ts`.

- [ ] **Step 2: Replace the boot logic**

Replace the body of `runVisualizer()` with the new App-based version:

```ts
import type { Command } from "commander";
import { createAudioSource } from "../../audio/createAudioSource.js";
import { installCleanupHandlers } from "../../utils/cleanup.js";
import { fatalError } from "../../utils/errors.js";
import { loadConfig } from "../../config/store.js";
import { App } from "../../player/App.js";

interface VisOpts {
  fps: string;
  audioDevice?: string;
  sampleRate: string;
  fftSize: string;
  noColor: boolean;
  silent: boolean;
}

export async function runVisualizer(opts: VisOpts): Promise<void> {
  const config = loadConfig();
  const sampleRate = parseInt(opts.sampleRate, 10) || 44100;
  const fftSize = parseInt(opts.fftSize, 10) || 2048;
  const audioDevice =
    opts.audioDevice ??
    (process.platform === "darwin" ? config.audio?.macosDeviceName : undefined);

  installCleanupHandlers();

  let audio;
  try {
    audio = createAudioSource({
      sampleRate, frameSize: fftSize, deviceName: audioDevice, silent: opts.silent,
    });
  } catch (err) {
    fatalError("Failed to create audio source", err);
  }

  const app = new App({ audio: audio!, noColor: opts.noColor });
  await app.start();
  // Process stays alive in the render loop; App exits on 'q' / Ctrl-C.
}

export function registerVisualizer(program: Command): void {
  program
    .command("visualize")
    .alias("viz")
    .description("Run the TUI.AMP v4.0 visualizer")
    .option("--fps <n>", "render FPS (ignored; fixed at 60)", "60")
    .option("--audio-device <name>", "audio device name")
    .option("--sample-rate <n>", "sample rate", "44100")
    .option("--fft-size <n>", "FFT size", "2048")
    .option("--no-color", "disable truecolor")
    .option("--silent", "skip audio capture")
    .action((opts) => runVisualizer(opts));
}
```

- [ ] **Step 3: Type-check**

Run: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/cli/commands/visualizer.ts
git commit -m "chore(cli): wire visualize command to new App

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Phase 10 — Delete obsolete code

### Task 25: Delete old engine, widgets, modes

**Files:**
- Delete: `src/visualizer/` (entire directory)
- Delete: `src/ui/layout.ts`
- Delete: `src/ui/AppScreen.ts` → keep (still used by App)
- Delete: `src/ui/theme.ts` (replaced by `src/player/theme.ts`)

- [ ] **Step 1: Remove files**

Run:
```bash
rm -rf src/visualizer
rm src/ui/layout.ts
rm src/ui/theme.ts
```

- [ ] **Step 2: Find any remaining references**

Run: `grep -rn "from.*visualizer\|from.*ui/layout\|from.*ui/theme" src/`
Expected: empty. If any hits, they're in surviving files and need to be repointed (likely to `src/player/layout.ts` or `src/player/theme.ts`).

- [ ] **Step 3: Type-check**

Run: `npm run build`
Expected: compiles. If imports break, fix them.

- [ ] **Step 4: Commit**

```bash
git add -u src/
git commit -m "chore: remove old engine, modes, widgets, layout, theme

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Phase 11 — Integration & manual verification

### Task 26: Full test sweep

- [ ] **Step 1: Run all tests**

Run: `npm test`
Expected: all unit tests pass, zero failures.

- [ ] **Step 2: Grep for `┼` in built code**

Run: `grep -rn "\u253C" src/ || echo "no forbidden ┼ found"`
Expected: `no forbidden ┼ found`.

- [ ] **Step 3: Confirm no `@ts-nocheck` remains**

Run: `grep -rn "@ts-nocheck" src/ || echo "clean"`
Expected: `clean`.

- [ ] **Step 4: Commit if anything changed**

If any fixups were needed, commit with a clear message.

---

### Task 27: Manual smoke test from main repo

- [ ] **Step 1: Launch app**

From the main repo (not the worktree, since `.env` is there):

```bash
cd /Users/trinabgoswamy/Audio-vis
git checkout claude/naughty-mahavira-f7cac6
npm run build && node dist/index.js visualize
```

- [ ] **Step 2: Eyeball the manual checklist from the spec**

Run through each numbered item in `docs/superpowers/specs/2026-04-19-tui-amp-v4-refactor-design.md` §13 "Manual checklist":
1. Alternate screen entered, grid renders, no flicker.
2. Spotify playing: title / art / scrubber update within 1 s.
3. Spectrum reactive at 60 Hz; L/R independent.
4. `/justice` → 8 results in ~200 ms → Enter plays.
5. `p n b m` transport works.
6. Resize through 96×24 both ways — clean.
7. Kick-drum passage triggers FIGlet swap + decay, no neighbour jitter.
8. `q` exits cleanly.

- [ ] **Step 3: Log anything that fails**

If a manual check fails, open a follow-up task describing what didn't work. Don't patch blindly — reproduce first.

---

## Self-review

**Spec coverage:** every section in `2026-04-19-tui-amp-v4-refactor-design.md` maps to a task:
- §3 module structure → Tasks 1-22 (create) + Task 25 (delete)
- §4 widget contract → enforced by widget signatures in Tasks 13-19
- §5 render architecture → Task 2 (dirty flush), Task 23 (tick loop)
- §6 grid layout math → Task 8
- §7 state shape → Task 9
- §8 feeders → Tasks 20-22
- §9 search → Task 11 (API) + Task 23 (UX)
- §10 input → Task 12
- §11 kinetic lyrics → Task 3 (font) + Task 18 (widget)
- §12 theme & palette → Task 10
- §13 testing → unit tests in Tasks 1-22, integration in Task 26, manual in Task 27
- §14 out of scope → explicitly not attempted
- §15 dependencies → only pre-existing `axios` / `jimp` used
- §16 security → noted in spec; no new surface introduced

**Placeholder scan:** no "TBD" / "TODO" / "implement later" markers in this plan.

**Type consistency:** `AppState`, `Theme`, `Region`, `AppLayout`, `InputEvent`, `SearchResult` are used consistently across tasks — no renames or signature drift.

**Scope check:** plan is a single coherent refactor; while long, every phase is a prerequisite for the next. Decomposing further would produce sub-plans that don't individually run — Phase 9 (App.ts) depends on everything before it.

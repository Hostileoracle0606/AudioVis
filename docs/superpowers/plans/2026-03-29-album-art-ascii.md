# Album Art ASCII Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fetch the current Spotify track's album cover, convert it to colored ASCII art, show a 4×2 thumbnail in the header, and expand to a full split overlay (art left, now-playing panel right) when the user clicks the header or presses `[a]`.

**Architecture:** Four new files under `src/album/` handle fetch/convert/cache independently. A new `"album-art"` VisMode is added to the existing engine dispatch. The wavefield renderer is reused at low amplitude for the plasma background behind the overlay — no new animation code needed.

**Tech Stack:** TypeScript, jimp (pure-JS image decode/resize), axios (already present), ANSI X3.64 mouse protocol, Node.js 18+

---

## Task 1: Install jimp and extend Spotify types

**Files:**
- Modify: `package.json`
- Modify: `src/spotify/types.ts`

- [ ] **Step 1: Install jimp (pinned to 0.x)**

Pin to the 0.x line — jimp v1.x has a completely different API and the converter in this plan uses the 0.x API (`Jimp.read`, `.clone()`, `.getPixelColor`).

```bash
cd /Users/trinabgoswamy/Audio-vis
npm install jimp@0.22.12
npm install --save-dev @types/jimp
```

Expected: `jimp@0.22.12` appears in `package.json` dependencies, `@types/jimp` in devDependencies, no native compilation warnings.

- [ ] **Step 3: Extend `SpotifyTrack.album` in `src/spotify/types.ts`**

Replace the `album` field (currently `album: { name: string }`) with:

```typescript
export interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  duration_ms: number;
  album: {
    name: string;
    images: Array<{ url: string; width: number; height: number }>;
  };
}
```

- [ ] **Step 4: Build to confirm no type errors**

```bash
npm run build
```

Expected: clean compile. The engine's `pollSpotify` already accesses `playback.item.album.name` — the new `images` field is additive and won't break anything.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/spotify/types.ts
git commit -m "feat: install jimp, extend SpotifyTrack with album images"
```

---

## Task 2: `src/album/fetcher.ts` — fetch image buffer

**Files:**
- Create: `src/album/fetcher.ts`

- [ ] **Step 1: Create the fetcher**

```typescript
// src/album/fetcher.ts
import axios from "axios";

/**
 * Fetch a remote image URL and return its raw bytes as a Buffer.
 * Throws on network error or non-2xx response.
 */
export async function fetchImageBuffer(url: string): Promise<Buffer> {
  const response = await axios.get<ArrayBuffer>(url, {
    responseType: "arraybuffer",
    timeout: 8000,
  });
  return Buffer.from(response.data);
}
```

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: clean compile.

- [ ] **Step 3: Commit**

```bash
git add src/album/fetcher.ts
git commit -m "feat: add album image fetcher"
```

---

## Task 3: `src/album/converter.ts` — pixel→ASCII conversion

**Files:**
- Create: `src/album/converter.ts`

This is the core module. It produces an `AsciiArt` object with a full-size `lines` array and a 4×2 `thumbnail`.

- [ ] **Step 1: Create the converter**

```typescript
// src/album/converter.ts
import Jimp from "jimp";

export interface AsciiArt {
  trackId: string;
  /** 2 rows × 4 cols thumbnail for the header icon. Each string is one row. */
  thumbnail: string[];
  /** Full-size art — one string per row, with ANSI 256-color codes. */
  lines: string[];
  /** Terminal dimensions at conversion time — stale-check on resize. */
  cols: number;
  rows: number;
}

const PALETTE = " .,:;+*#%@█";

/** Map luminance [0,1] to an ASCII character. */
function lumToChar(lum: number): string {
  const idx = Math.min(
    PALETTE.length - 1,
    Math.floor(lum * PALETTE.length)
  );
  return PALETTE[idx];
}

/**
 * Find the nearest xterm-256 color index for an RGB value.
 * Uses the 216-color cube (indices 16–231) for color fidelity.
 */
function rgbToAnsi256(r: number, g: number, b: number): number {
  const ri = Math.round((r / 255) * 5);
  const gi = Math.round((g / 255) * 5);
  const bi = Math.round((b / 255) * 5);
  return 16 + 36 * ri + 6 * gi + bi;
}

/** Wrap a character with ANSI 256 foreground color. */
function colorChar(ch: string, r: number, g: number, b: number): string {
  const code = rgbToAnsi256(r, g, b);
  return `\x1b[38;5;${code}m${ch}\x1b[0m`;
}

/**
 * Convert a raw image buffer to an AsciiArt object.
 *
 * @param buffer   Raw JPEG/PNG bytes
 * @param trackId  Spotify track ID (stored for cache keying)
 * @param vizCols  Width of the visualizer region in terminal columns
 * @param vizRows  Height of the visualizer region in terminal rows
 * @param noColor  If true, emit plain ASCII without ANSI color codes
 */
export async function convertToAscii(
  buffer: Buffer,
  trackId: string,
  vizCols: number,
  vizRows: number,
  noColor: boolean
): Promise<AsciiArt> {
  // Left panel is 48% of visualizer width
  const artCols = Math.floor(vizCols * 0.48);
  // Correct for terminal character aspect ratio (~2:1 height:width)
  const artRows = Math.floor(artCols / 2.2);
  const targetRows = Math.min(artRows, vizRows - 2); // leave 1 row margin top+bottom
  const targetCols = Math.floor(targetRows * 2.2);

  const img = await Jimp.read(buffer);

  // ── Full-size art ──────────────────────────────────────────────────────────
  const full = img.clone().resize(targetCols, targetRows);
  const lines: string[] = [];

  for (let row = 0; row < targetRows; row++) {
    let line = "";
    for (let col = 0; col < targetCols; col++) {
      const pixel = full.getPixelColor(col, row);
      const r = (pixel >>> 24) & 0xff;
      const g = (pixel >>> 16) & 0xff;
      const b = (pixel >>> 8)  & 0xff;
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const ch = lumToChar(lum);
      line += noColor ? ch : colorChar(ch, r, g, b);
    }
    lines.push(line);
  }

  // ── 4×2 thumbnail ─────────────────────────────────────────────────────────
  const thumb = img.clone().resize(4, 2);
  const thumbnail: string[] = [];

  for (let row = 0; row < 2; row++) {
    let line = "";
    for (let col = 0; col < 4; col++) {
      const pixel = thumb.getPixelColor(col, row);
      const r = (pixel >>> 24) & 0xff;
      const g = (pixel >>> 16) & 0xff;
      const b = (pixel >>> 8)  & 0xff;
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const ch = lumToChar(lum);
      line += noColor ? ch : colorChar(ch, r, g, b);
    }
    thumbnail.push(line);
  }

  return {
    trackId,
    thumbnail,
    lines,
    cols: vizCols,
    rows: vizRows,
  };
}
```

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: clean compile. If jimp types are missing, run `npm install @types/jimp --save-dev`.

- [ ] **Step 3: Commit**

```bash
git add src/album/converter.ts
git commit -m "feat: add ASCII art converter (jimp pixel→char, ANSI 256 color)"
```

---

## Task 4: `src/album/cache.ts` — LRU cache

**Files:**
- Create: `src/album/cache.ts`

- [ ] **Step 1: Create the cache**

```typescript
// src/album/cache.ts
import type { AsciiArt } from "./converter.js";

const MAX_SIZE = 3;
const _cache = new Map<string, AsciiArt>();

/**
 * Retrieve cached art by track ID. Returns undefined on miss.
 * Refreshes insertion order (LRU).
 */
export function getCached(trackId: string): AsciiArt | undefined {
  const entry = _cache.get(trackId);
  if (entry === undefined) return undefined;
  // Refresh: delete + re-insert moves to "most recently used" position
  _cache.delete(trackId);
  _cache.set(trackId, entry);
  return entry;
}

/**
 * Store art in the cache. Evicts the least-recently-used entry if over MAX_SIZE.
 */
export function setCached(trackId: string, art: AsciiArt): void {
  if (_cache.has(trackId)) _cache.delete(trackId);
  _cache.set(trackId, art);
  if (_cache.size > MAX_SIZE) {
    // Map iterates in insertion order — first key is LRU
    const lruKey = _cache.keys().next().value;
    if (lruKey !== undefined) _cache.delete(lruKey);
  }
}
```

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: clean compile.

- [ ] **Step 3: Commit**

```bash
git add src/album/cache.ts
git commit -m "feat: add LRU album art cache (size 3, keyed by track ID)"
```

---

## Task 5: Extend `VisState` and `VisMode`

**Files:**
- Modify: `src/visualizer/state.ts`

- [ ] **Step 1: Add `"album-art"` to `VisMode` and new fields to `VisState`**

Replace the top of `src/visualizer/state.ts`:

```typescript
import type { AsciiArt } from "../album/converter.js";

export type VisMode = "wavefield" | "scroll" | "spectrum" | "album-art";

export interface VisState {
  mode: VisMode;

  // DSP state
  smoothedBuckets: Float32Array;
  rawBuckets: Float32Array;
  low: number;
  mid: number;
  high: number;
  amplitude: number;
  pulse: number;

  // Spotify metadata
  trackName: string;
  artistName: string;
  albumName: string;
  deviceName: string;
  isPlaying: boolean;
  progressMs: number;
  durationMs: number;

  // Album art
  albumArt: AsciiArt | null;
  albumArtUrl: string;
  priorMode: VisMode;

  // Terminal dimensions
  cols: number;
  rows: number;

  // Time (for animation phases)
  startTime: number;

  // Number of visual buckets / bars
  numBars: number;

  // Ring buffer for scroll mode
  scrollHistory: Float32Array;
}

export function createInitialState(
  mode: VisMode,
  numBars: number,
  cols: number,
  rows: number
): VisState {
  return {
    mode,
    smoothedBuckets: new Float32Array(numBars),
    rawBuckets: new Float32Array(numBars),
    low: 0,
    mid: 0,
    high: 0,
    amplitude: 0,
    pulse: 0,

    trackName: "",
    artistName: "",
    albumName: "",
    deviceName: "",
    isPlaying: false,
    progressMs: 0,
    durationMs: 0,

    albumArt: null,
    albumArtUrl: "",
    priorMode: mode,

    cols,
    rows,
    startTime: Date.now(),
    numBars,
    scrollHistory: new Float32Array(cols),
  };
}
```

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: TypeScript will flag `albumName` as unused in `engine.ts` — that's fine, we wire it next task. Any other errors mean a typo in the state shape.

- [ ] **Step 3: Commit**

```bash
git add src/visualizer/state.ts
git commit -m "feat: add album-art mode and art/priorMode fields to VisState"
```

---

## Task 6: `src/visualizer/modes/albumArt.ts` — overlay renderer

**Files:**
- Create: `src/visualizer/modes/albumArt.ts`

- [ ] **Step 1: Create the overlay renderer**

```typescript
// src/visualizer/modes/albumArt.ts
import type { VisState } from "../state.js";
import type { Renderer } from "../../ui/renderer.js";
import type { Theme } from "../../ui/theme.js";
import type { Region } from "../../ui/layout.js";
import { renderWavefield } from "./wavefield.js";
import { formatSeconds } from "../../ui/format.js";
import { truncateMiddle } from "../../ui/format.js";

/**
 * Render the album-art overlay mode.
 *
 * Layout (within the visualizer region):
 *   [plasma background at 0.15× amplitude]
 *   left 48%  : ASCII art, centered vertically
 *   col W/2-1 : vertical divider
 *   right 52% : now-playing panel (track, artist, album, progress, controls)
 */
export function renderAlbumArt(
  state: VisState,
  renderer: Renderer,
  region: Region,
  theme: Theme
): void {
  const { x: rx, y: ry, width: RW, height: RH } = region;

  // ── 1. Plasma background (wavefield at 0.15× amplitude) ───────────────────
  const dimState = {
    ...state,
    amplitude: state.amplitude * 0.15,
    low:       state.low       * 0.15,
    mid:       state.mid       * 0.15,
    high:      state.high      * 0.15,
    pulse:     0,
  };
  renderWavefield(dimState, renderer, region, theme);

  // ── 2. Compute column boundaries ──────────────────────────────────────────
  const artColWidth  = Math.floor(RW * 0.48);
  const dividerCol   = rx + artColWidth;
  const infoColStart = dividerCol + 1;
  const infoColWidth = RW - artColWidth - 1;

  // ── 3. Vertical divider ───────────────────────────────────────────────────
  for (let row = 0; row < RH; row++) {
    renderer.write(dividerCol, ry + row, "│");
  }

  // ── 4. ASCII art (left panel) ─────────────────────────────────────────────
  if (state.albumArt) {
    const artLines = state.albumArt.lines;
    const artH = artLines.length;
    const vertOffset = Math.max(0, Math.floor((RH - artH) / 2));

    for (let i = 0; i < artLines.length; i++) {
      const row = ry + vertOffset + i;
      if (row >= ry + RH) break;
      renderer.write(rx, row, artLines[i]);
    }
  } else {
    // No art available — show placeholder
    const msg = "No art";
    const midRow = ry + Math.floor(RH / 2);
    const midCol = rx + Math.floor((artColWidth - msg.length) / 2);
    renderer.write(midCol, midRow, msg);
  }

  // ── 5. Now-playing panel (right panel) ────────────────────────────────────
  const colX = infoColStart + 2; // 2-char left padding inside panel
  const maxW  = infoColWidth - 3;

  let panelRow = ry + Math.max(1, Math.floor(RH / 2) - 5);

  // "NOW PLAYING" label
  renderer.write(colX, panelRow, "NOW PLAYING");
  panelRow += 2;

  // Track name (large — written as-is, truncated)
  renderer.write(colX, panelRow, truncateMiddle(state.trackName, maxW));
  panelRow += 1;

  // Artist
  renderer.write(colX, panelRow, truncateMiddle(state.artistName, maxW));
  panelRow += 1;

  // Album
  renderer.write(colX, panelRow, truncateMiddle(state.albumName, maxW));
  panelRow += 2;

  // Progress bar
  if (state.durationMs > 0) {
    const progress = state.progressMs / state.durationMs;
    const barW = Math.max(4, maxW - 14); // leave room for timestamps
    const filled = Math.round(progress * barW);
    const empty  = barW - filled;
    const elapsed = formatSeconds(state.progressMs / 1000);
    const total   = formatSeconds(state.durationMs / 1000);
    const bar = elapsed + " " + "─".repeat(filled) + "●" + "─".repeat(empty) + " " + total;
    renderer.write(colX, panelRow, truncateMiddle(bar, maxW));
    panelRow += 2;
  }

  // Playback controls
  const controls = state.isPlaying
    ? "⏮  [p]rev    ⏸  [space]    [n]ext  ⏭"
    : "⏮  [p]rev    ▶  [space]    [n]ext  ⏭";
  renderer.write(colX, panelRow, truncateMiddle(controls, maxW));
  panelRow += 2;

  // Close hint
  renderer.write(colX, panelRow, "[a] or click header to close");
}
```

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: clean compile.

- [ ] **Step 3: Commit**

```bash
git add src/visualizer/modes/albumArt.ts
git commit -m "feat: add album art overlay renderer (split layout, dimmed plasma bg)"
```

---

## Task 7: Extend `src/ui/input.ts` — `[a]` key + ANSI mouse

**Files:**
- Modify: `src/ui/input.ts`

- [ ] **Step 1: Add `"toggle_album_art"` action and mouse parsing**

Replace `src/ui/input.ts` entirely:

```typescript
import readline from "readline";

export type Action =
  | "quit"
  | "toggle_play"
  | "next"
  | "prev"
  | "switch_mode"
  | "refresh"
  | "toggle_album_art";

type ActionHandler = (action: Action) => void;

let _handler: ActionHandler | null = null;
let _rawMode = false;

/**
 * Enable raw key input and mouse reporting, register an action handler.
 */
export function startInput(handler: ActionHandler): void {
  _handler = handler;

  if (!_rawMode) {
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    _rawMode = true;
  }

  // Enable X10 mouse click reporting (button press only, no motion)
  process.stdout.write("\x1b[?1000h");

  process.stdin.on("keypress", handleKeypress);
  process.stdin.on("data", handleData);
}

export function stopInput(): void {
  process.stdout.write("\x1b[?1000l"); // disable mouse reporting
  process.stdin.removeListener("keypress", handleKeypress);
  process.stdin.removeListener("data", handleData);
  if (_rawMode && process.stdin.isTTY) {
    process.stdin.setRawMode(false);
    _rawMode = false;
  }
  _handler = null;
}

function handleKeypress(
  _chunk: string,
  key: { name?: string; ctrl?: boolean; sequence?: string }
): void {
  if (!_handler) return;

  if (key.ctrl && key.name === "c") {
    _handler("quit");
    return;
  }

  switch (key.name ?? _chunk) {
    case "q":         _handler("quit");               break;
    case "space":     _handler("toggle_play");         break;
    case "n":         _handler("next");                break;
    case "p":         _handler("prev");                break;
    case "s":         _handler("switch_mode");         break;
    case "r":         _handler("refresh");             break;
    case "a":         _handler("toggle_album_art");    break;
    case "escape":    _handler("toggle_album_art");    break;
  }
}

/**
 * Parse raw stdin bytes for ANSI mouse sequences.
 * X10 format: ESC [ M <cb> <cx> <cy>
 *   cb = button byte: cb & 3 === 0 → left button press
 *   cx, cy = 1-based column and row (offset by 32)
 */
function handleData(data: Buffer): void {
  if (!_handler) return;
  if (data.length < 6) return;
  if (data[0] !== 0x1b || data[1] !== 0x5b || data[2] !== 0x4d) return; // ESC [ M

  const cb  = data[3] - 32;
  const col = data[4] - 32 - 1; // convert to 0-based
  const row = data[5] - 32 - 1; // convert to 0-based

  const isLeftPress = (cb & 3) === 0;
  const isHeaderRow = row === 0 || row === 1;

  if (isLeftPress && isHeaderRow) {
    _handler("toggle_album_art");
  }
}
```

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: clean compile.

- [ ] **Step 3: Commit**

```bash
git add src/ui/input.ts
git commit -m "feat: add [a]/esc keybind and ANSI mouse header-click for album art toggle"
```

---

## Task 8: Wire everything into `src/visualizer/engine.ts`

**Files:**
- Modify: `src/visualizer/engine.ts`

This is the final wiring task. Four changes: (1) import new modules, (2) wire album fetch into `pollSpotify`, (3) write thumbnail in header, (4) dispatch `"album-art"` mode and handle `"toggle_album_art"` action.

- [ ] **Step 1: Add imports at the top of `engine.ts`**

After the existing imports, add:

```typescript
import { fetchImageBuffer } from "../album/fetcher.js";
import { convertToAscii } from "../album/converter.js";
import { getCached, setCached } from "../album/cache.js";
import { renderAlbumArt } from "./modes/albumArt.js";
```

- [ ] **Step 2: Update `pollSpotify()` to fetch and store album art**

Replace the body of `pollSpotify()` with:

```typescript
private async pollSpotify(): Promise<void> {
  try {
    const playback = await spotify.getCurrentPlayback();
    if (!playback || !playback.item) {
      this.state.trackName   = "";
      this.state.artistName  = "";
      this.state.albumName   = "";
      this.state.deviceName  = playback?.device?.name ?? "";
      this.state.isPlaying   = false;
      this.state.progressMs  = 0;
      this.state.durationMs  = 0;
      this.state.albumArtUrl = "";
      this.state.albumArt    = null;
      return;
    }

    this.state.trackName  = playback.item.name;
    this.state.artistName = playback.item.artists.map((a) => a.name).join(", ");
    this.state.albumName  = playback.item.album.name;
    this.state.deviceName = playback.device?.name ?? "";
    this.state.isPlaying  = playback.is_playing;
    this.state.progressMs = playback.progress_ms ?? 0;
    this.state.durationMs = playback.item.duration_ms;

    // Album art: use the smallest image (last in array, Spotify orders largest→smallest)
    const images = playback.item.album.images;
    const imageUrl = images.length > 0 ? images[images.length - 1].url : "";

    if (imageUrl && imageUrl !== this.state.albumArtUrl) {
      this.state.albumArtUrl = imageUrl;

      const cached = getCached(playback.item.id);
      if (cached && cached.cols === this.state.cols) {
        this.state.albumArt = cached;
      } else {
        // Fetch and convert async — don't block the poll
        const trackId = playback.item.id;
        const cols    = this.state.cols;
        const rows    = this.state.rows;
        const noColor = this.opts.noColor;
        const layout  = computeLayout(cols, rows);
        const vizH    = layout.visualizer.height;

        fetchImageBuffer(imageUrl)
          .then((buf) => convertToAscii(buf, trackId, cols, vizH, noColor))
          .then((art) => {
            setCached(trackId, art);
            // Only apply if still the same track
            if (this.state.albumArtUrl === imageUrl) {
              this.state.albumArt = art;
            }
          })
          .catch(() => {
            // Network/decode failure — no art, no crash
          });
      }
    }
  } catch {
    // Network or auth error — don't crash the visualizer
  }
}
```

- [ ] **Step 3: Write thumbnail in header inside `renderFrame()`**

In `renderFrame()`, after the existing `if (hasTrack)` block writes the title line, add thumbnail rendering. Find this comment block:

```typescript
    // --- Header ---
```

Inside the `if (hasTrack)` block, the first `this.renderer.write(0, 0, ...)` call writes the title starting at col 0. Change the title to start at col 5 (to leave room for the 4-char icon + 1 space), and add thumbnail writes before it:

```typescript
    // --- Header ---
    const hasTrack = s.trackName.length > 0;
    const deviceLabel = s.deviceName ? `[${s.deviceName}]` : "";
    const DEVICE_PAD = deviceLabel.length + 1;

    if (hasTrack) {
      // Thumbnail (4×2 icon) — left of track name
      if (s.albumArt) {
        this.renderer.write(0, 0, s.albumArt.thumbnail[0] ?? "    ");
        this.renderer.write(0, 1, s.albumArt.thumbnail[1] ?? "    ");
      } else {
        this.renderer.write(0, 0, "    ");
        this.renderer.write(0, 1, "    ");
      }

      const titleFull = `${s.trackName}  —  ${s.artistName}`;
      const maxTitleW = Math.max(1, cols - DEVICE_PAD - 6);
      const titleLine = "  " + truncateMiddle(titleFull, maxTitleW - 2);
      this.renderer.write(5, 0, padRight(titleLine, cols - DEVICE_PAD - 5));
      this.renderer.write(cols - DEVICE_PAD, 0, padLeft(deviceLabel, DEVICE_PAD));

      const stateStr = s.isPlaying ? "Playing" : "Paused";
      const elapsed  = formatSeconds(s.progressMs / 1000);
      const total    = formatSeconds(s.durationMs / 1000);
      const timePart = `${elapsed} / ${total}`;
      const stateLine = `  State: ${stateStr}`;
      this.renderer.write(5, 1, padRight(stateLine, cols - timePart.length - 6));
      this.renderer.write(cols - timePart.length, 1, timePart);
    } else {
      this.renderer.write(0, 0, "  Now playing: Nothing active");
      this.renderer.write(0, 1, "  State: Idle");
    }
```

- [ ] **Step 4: Add `"album-art"` dispatch in `renderFrame()`**

Find the visualizer dispatch block:

```typescript
    if (s.mode === "wavefield") {
      renderWavefield(s, this.renderer, layout.visualizer, this.theme);
    } else if (s.mode === "scroll") {
      renderScroll(s, this.renderer, layout.visualizer, this.theme);
    } else {
      renderSpectrum(s, this.renderer, layout.visualizer, this.theme);
    }
```

Replace with:

```typescript
    if (s.mode === "wavefield") {
      renderWavefield(s, this.renderer, layout.visualizer, this.theme);
    } else if (s.mode === "scroll") {
      renderScroll(s, this.renderer, layout.visualizer, this.theme);
    } else if (s.mode === "album-art") {
      renderAlbumArt(s, this.renderer, layout.visualizer, this.theme);
    } else {
      renderSpectrum(s, this.renderer, layout.visualizer, this.theme);
    }
```

- [ ] **Step 5: Add `"toggle_album_art"` to `handleAction()`**

Find the switch in `handleAction()` and add a new case before the closing `}`:

```typescript
        case "toggle_album_art":
          if (this.state.mode !== "album-art") {
            if (this.state.albumArt) {
              this.state.priorMode = this.state.mode;
              this.state.mode = "album-art";
            }
          } else {
            this.state.mode = this.state.priorMode;
          }
          break;
```

- [ ] **Step 6: Update resize handler to invalidate stale art**

Find the resize handler:

```typescript
    process.stdout.on("resize", () => {
      const { cols: c, rows: r } = getTerminalSize();
      this.renderer.resize(c, r);
      this.state.cols = c;
      this.state.rows = r;
      this.state.scrollHistory = new Float32Array(c);
    });
```

Replace with:

```typescript
    process.stdout.on("resize", () => {
      const { cols: c, rows: r } = getTerminalSize();
      this.renderer.resize(c, r);
      this.state.cols = c;
      this.state.rows = r;
      this.state.scrollHistory = new Float32Array(c);
      // Force art reconversion at new size on next poll
      if (this.state.albumArt && this.state.albumArt.cols !== c) {
        this.state.albumArtUrl = "";
        this.state.albumArt = null;
      }
    });
```

- [ ] **Step 7: Update footer hint to include `[a]`**

Find:

```typescript
    const footer =
      "[space] play/pause   [n] next   [p] prev   [s] mode   [q] quit";
```

Replace with:

```typescript
    const footer =
      "[space] play/pause   [n] next   [p] prev   [s] mode   [a] art   [q] quit";
```

- [ ] **Step 8: Build**

```bash
npm run build
```

Expected: clean compile with no errors.

- [ ] **Step 9: Commit**

```bash
git add src/visualizer/engine.ts
git commit -m "feat: wire album art fetch, thumbnail header icon, overlay mode, and toggle action"
```

---

## Task 9: Manual smoke test

- [ ] **Start the visualizer**

```bash
npm run dev -- visualize
```

Or if built:

```bash
npm start -- visualize
```

- [ ] **Verify thumbnail appears** — within ~2 seconds of a track playing, 4 colored characters should appear at the left of header rows 0–1.

- [ ] **Press `[a]`** — overlay should open: left half shows ASCII art of the album cover, right half shows track/artist/album, progress bar, and control hints. Background should show a dimmed wavefield plasma.

- [ ] **Press `[a]` again** — overlay closes, returns to the prior visualizer mode.

- [ ] **Click header rows** — same toggle behavior as `[a]`.

- [ ] **Press `[esc]` while in overlay** — closes overlay.

- [ ] **Skip tracks with `[n]`** — thumbnail and overlay art update to the new track.

- [ ] **Resize terminal while in overlay** — art reconverts cleanly at new size within ~1 poll cycle.

- [ ] **Run with `--no-color`**

```bash
npm run dev -- visualize --no-color
```

Plain ASCII chars in thumbnail and overlay, no ANSI color codes.

- [ ] **Disconnect network** (turn off Wi-Fi or block DNS) — no crash, no thumbnail, overlay toggle is a no-op.

---

## Manual Test Checklist (from spec)

- [ ] Thumbnail appears in header after track loads
- [ ] Thumbnail updates when track changes
- [ ] Click header rows 0–1 → overlay opens
- [ ] `esc` or second header click → overlay closes, returns to prior mode
- [ ] `[a]` keypress toggles; footer hint shows `[a] art`
- [ ] `--no-color` / `--ascii-safe` → plain chars, no ANSI codes
- [ ] Resize terminal while overlay open → art reconverts at new size
- [ ] Network down → no crash; no thumbnail; overlay toggle is no-op
- [ ] Fast track skipping → cache prevents redundant fetches

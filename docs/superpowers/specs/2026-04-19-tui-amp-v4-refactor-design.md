# TUI.AMP v4.0 — full UI refactor

**Date:** 2026-04-19
**Status:** Approved, ready for implementation planning
**Scope:** Rewrite `src/ui/*` and `src/visualizer/*` against a new fixed-grid layout. Keep `src/audio/`, `src/dsp/`, `src/lyrics/`, `src/album/`, `src/macos/`, `src/config/`, `src/utils/`, `src/cli/`, `src/index.ts` as stable interfaces. One small additive change to `src/dsp/` (channel-peak helper) and one to `src/macos/spotifyDesktop.ts` (`playTrack(uri)`).

---

## 1. Goals and aesthetic

- Minimalist, retro-futurist hardware rack.
- Strict grid: one outer rounded-corner border, one title bar, one top row (3 cells), one middle row (2 cells — equal halves, the one hard requirement), one bottom row (scrubber + hotkey legend).
- Box-drawing palette: `╭ ╮ ╰ ╯ │ ─ ├ ┤ ┬ ┴`. **No `┼`** — the column layouts are deliberately non-aligned so a 4-way junction never occurs.
- 60 FPS reactive zone (lyrics + spectrum) without screen tearing.
- No GUI or web libraries. Node.js + TypeScript throughout.

## 2. Locked decisions (from brainstorming Q&A)

| # | Decision |
|---|---|
| 1 | **Scope B** — rewrite UI + visualizer engine; keep audio/DSP/lyrics/album/macOS/cli. |
| 2 | **Recently-played** panel (not a queue), fed by a ring buffer on the Spotify Desktop poll loop. Top-8, dedup by track ID, most recent first. |
| 3 | **Render architecture** — pure widget functions + dirty-region flush; non-blocking producer/consumer for audio and Spotify (never `await` on the render tick). |
| 4 | **Search** — Spotify Web API Client Credentials flow for `GET /v1/search`; playback dispatched via `osascript` `tell application "Spotify" to play track "spotify:track:<id>"`. Re-uses existing `SPOTIFY_CLIENT_ID`/`SPOTIFY_CLIENT_SECRET` in `.env` (lives in main repo, not this worktree). |
| 5 | **Kinetic lyrics** — hand-embedded 8×6 block-character bitmap font. No external FIGlet dependency. |
| 6 | **SYS.LOAD** — real, via `process.cpuUsage()` sampled at 1 Hz with exponential smoothing (α = 0.3). |
| 7 | **Album art** — existing 24-bit truecolor half-block renderer (`ansilize()`), sized to the actual top-left cell dimensions. No palette change. |
| 8 | **L/R master meter** — per-channel peak extracted from the existing stereo stream via a new `extractChannelPeaks()` helper in `src/dsp/`. |
| 9 | **Hotkey `[v] Vis Mode`** — repurposed as spectrum palette cycle (the old mode system is deleted). |
| 10 | **Mouse input removed** — keyboard-only. |

## 3. Module structure

### Deleted
- `src/visualizer/engine.ts`
- `src/visualizer/state.ts`
- `src/visualizer/modes/*` (all nine files)
- `src/visualizer/widgets/*` (recordDeck, wavePanel, searchBar, lyricsTerminal)
- `src/ui/layout.ts` — superseded by `src/player/layout.ts`. The old `computeLayout`, `computePlayerLayout`, and `isTooSmall` helpers are no longer referenced after the engine rewrite; delete the file.

### Kept untouched
- `src/audio/*`, `src/dsp/*` (plus one additive file)
- `src/lyrics/lrclib.ts`
- `src/album/*` (fetcher, converter, ansilize, cache)
- `src/macos/spotifyDesktop.ts` (one additive function)
- `src/config/*`, `src/utils/*`, `src/cli/*`, `src/index.ts`
- `src/ui/AppScreen.ts`, `src/ui/renderer.ts` (extended, not rewritten), `src/ui/tui.ts`, `src/ui/progressBar.ts`, `src/ui/format.ts`, `src/ui/input.ts` (restructured for two-mode input)

### New
```
src/ui/
  borders.ts              rounded box + junction drawing (╭╮╰╯│─├┤┬┴)
  bitfont.ts              8×6 block bitmap font for kinetic lyrics
  cpuLoad.ts              process.cpuUsage() sampler
src/player/
  App.ts                  main loop, replaces VisualizerEngine
  layout.ts               new grid: titleBar / sep / topRow / sep / middleRow / sep / bottomRow
  state.ts                AppState + helpers (pushRecentlyPlayed, etc.)
  theme.ts                colour palettes (spectrum + ui)
  feeders/
    audioFeeder.ts        FFT buckets + L/R peaks + transient detection
    spotifyFeeder.ts      AppleScript polling + ring buffer triggers
    lyricsFeeder.ts       LRClib fetch on track change
    albumArtFeeder.ts     image fetch + ansilize on track change / resize
    cpuFeeder.ts          1 Hz CPU sampler
  search/
    spotifyWebApi.ts      Client Credentials token + /v1/search
    searchState.ts        query/results/selection helpers
  widgets/
    titleBar.ts           [ TUI.AMP v4.0 ] + search bar + SYS.LOAD
    albumArt.ts           top-left cell
    nowPlaying.ts         top-center cell + L/R meter
    recentlyPlayed.ts     top-right cell
    lyrics.ts             middle-left cell + 8×6 FIGlet on peak
    spectrum.ts           middle-right cell (16-band bars)
    controls.ts           bottom: scrubber + hotkey legend
```

### Additive changes to kept modules
- `src/dsp/channelPeaks.ts` — new file. Exports `extractChannelPeaks(interleaved: Float32Array, numChannels: number): number[]`. ~15 lines.
- `src/macos/spotifyDesktop.ts` — add `export async function playTrack(uri: string): Promise<void>`. Reuses existing `tell()` pattern.
- `src/ui/renderer.ts` — add `flushDirty()`, `invalidate()`, and test-only `debugLines()`. Keep `flush()` unchanged.
- `src/ui/input.ts` — restructure to a two-mode (hotkey/text) event emitter. Signature changes; all call sites updated.

## 4. Widget contract

Every widget is a pure function:

```ts
type WidgetFn = (
  r: Renderer,
  region: Region,
  state: AppState,
  theme: Theme,
) => void;
```

- No timers, no I/O, no `await`, no imports from `feeders/` or `search/`.
- Given the same `(region, state, theme)` they must produce identical cell writes. This is what makes dirty-region flushing safe.
- Widgets write into `r` at absolute coordinates inside `region`. They never write outside their region (tested).

## 5. Render architecture

- 60 FPS target via `setImmediate`-chained tick loop, not `setInterval` — yields to I/O callbacks between frames.
- Each tick:
  1. **Build**: clear cell buffer, call widgets top-to-bottom.
  2. **Diff**: per-row equality against previous frame's lines.
  3. **Flush**: concat `ESC[<r>;1H\x1b[0m<line>` for each dirty row; single `process.stdout.write()`.
- Tearing avoidance: one syscall per frame. Terminals render stdout writes atomically per write() on all major emulators.
- Resize: `process.stdout.on("resize")` → `renderer.resize()` + `renderer.invalidate()` → next tick does a full `flush()` (not `flushDirty()`) → subsequent ticks resume dirty-flushing.
- First paint: always a full `flush()`. Dirty tracking engages on frame 2.
- Too-small: below 96×24, draw a single centered "Terminal too small" line and skip the normal frame.

## 6. Grid layout math

```ts
const outer = { x: 0, y: 0, width: cols, height: rows };
const inner = { x: 1, y: 1, width: cols - 2, height: rows - 2 };

const [titleBar, sep1, topRow, sep2, middleRow, sep3, bottomRow] =
  vSplit(inner, [
    C.length(1), C.length(1),
    C.length(10),              // top row: album / now-playing / recently-played
    C.length(1),
    C.fill(),                  // middle row: lyrics | spectrum
    C.length(1),
    C.length(2),               // scrubber + hotkey
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
```

### Border junctions
- **sep1** (below title bar): `├` + `─` + `┬` at the two top-row column-break X + `┤`.
- **sep2** (below top row): `├` + `─` + `┴` at each top-row column-break X + `┬` at the middle-row column-break X (50%) + `┤`.
- **sep3** (below middle row): `├` + `─` + `┴` at the middle-row column-break X + `┤`.
- **Column dividers**: vertical `│` runs, drawn inside each row.
- **Outer corners**: `╭ ╮ ╰ ╯`. Left/right edges: `│`, meeting separators at `├`/`┤`.

### Minimum size
`96 × 24`. Below that, render "Terminal too small: WxH (minimum 96x24)" centered, no other content.

## 7. State shape

See §4 of the brainstorming design for the full `AppState` interface. Owners:
- `audioFeeder` writes `spectrum`, `meterL`, `meterR`, `rms`, `transientPeak`, `transientEnergy`.
- `spotifyFeeder` writes `nowPlaying`, `recentlyPlayed`, `isPlaying`, `progressMs`, `durationMs`, `lastSpotifyPollAt`; triggers `albumArtFeeder` and `lyricsFeeder` on track change.
- `lyricsFeeder` writes `lyrics` (on track change); `activeLyricIndex` is recomputed inline each render tick from `progressMs` + `lyrics`.
- `albumArtFeeder` writes `albumArt`.
- `cpuFeeder` writes `cpuPct`.
- `App` (in its input event handler, not a dedicated feeder) writes `search.*` by calling into `search/searchState.ts` helpers and `search/spotifyWebApi.ts`.
- `App` also writes `cols`, `rows`, `quit`, `spectrumPaletteIndex`, `artCellMode` (art / vu / blank), `isMuted`, `savedVolume`.

Single-threaded JS guarantees each slice update is atomic. The render tick reads without copying.

## 8. Feeders

### `audioFeeder.ts`
Hooks into `AudioSource`'s stereo stream. Per buffer:
1. Deinterleave to L/R → `extractChannelPeaks()` → smooth → `state.meterL / meterR`.
2. Mix to mono → existing FFT + buckets → smooth → `state.spectrum` (16 bands).
3. `extractFeatures()` → `state.rms`, `state.transientPeak`, `state.transientEnergy` (with exponential decay so the FIGlet effect fades over ~300 ms).

### `spotifyFeeder.ts`
`setInterval(1000)` with `inFlight` flag. Each tick: `await spotifyDesktop.getState()`.
- On success: update `nowPlaying`, `isPlaying`, `progressMs`, `durationMs`.
- On track change (by trackName+artistName compound key): `pushRecentlyPlayed(state, entry)`; trigger album-art fetch; trigger lyrics fetch.
- On failure: `nowPlaying = null`. Widgets render placeholders.

Progress extrapolation between polls: the scrubber widget reads `state.progressMs + (now - state.lastSpotifyPollAt)`, clamped to `durationMs`. Keeps the scrubber smooth at 60 Hz despite 1 Hz polling.

### `lyricsFeeder.ts`
On track change: `fetchLyrics(title, artist)` via `lrclib.ts`, cache by `"${artist}::${title}"`. On success → `state.lyrics`. On miss → `[]`. The per-tick `activeLyricIndex` lookup happens inside `App.renderFrame()` before widgets run, not in the feeder.

### `albumArtFeeder.ts`
On track change: `fetchImageBuffer(url)` (existing cache in `src/album/cache.ts`) → `convertToAscii()` sized to the *current* top-left cell dimensions. On resize, re-render from the cached buffer at the new cell size (Jimp resize is ~20 ms for 300×300 → ~20×10 cells; fine).

### `cpuFeeder.ts`
1 Hz delta between `process.cpuUsage()` samples divided by elapsed wall time → percent of one core. Smoothed (α = 0.3). Displayed as `SYS.LOAD: X.X%`.

## 9. Search subsystem

### `search/spotifyWebApi.ts`
- `getAccessToken()`: memoized. On first call or when `expiresAt - now < 60_000`:
  - `POST https://accounts.spotify.com/api/token`
  - Body: `grant_type=client_credentials`
  - Header: `Authorization: Basic ${base64(clientId:clientSecret)}`
  - Parse `{ access_token, expires_in }`, compute `expiresAt = now + expires_in * 1000`.
- `search(query)`:
  - `GET https://api.spotify.com/v1/search?q=<encoded>&type=track&limit=8&market=from_token`
  - Header: `Authorization: Bearer ${token}`
  - On 401: invalidate token, retry once.
  - Returns `SearchResult[]`: `{ id, uri, name, artist, album, durationMs }`.

### `search/searchState.ts`
Pure functions over `state.search`: `setQuery`, `setResults`, `selectNext`, `selectPrev`, `close`.

### Search UX
- `/` key (hotkey mode) → `state.search.focused = true`; input mode flips to "text".
- Typing → `query` updated, 180 ms debounce timer reset.
- Debounce fires → `state.search.loading = true`, request issued with `AbortController`. New query cancels previous.
- Response → `state.search.results`, `loading = false`, `selectedIndex = 0`.
- ↑/↓ → move selection.
- Enter → `spotifyDesktop.playTrack(results[selectedIndex].uri)` → close search.
- Esc → close without playing.
- Results render either: below the search bar as a dropdown overlay (~8 rows), OR inline in the `recentlyPlayed` cell during search. **Chosen**: dropdown overlay, drawn on top of the top row's cells during search-active. Dirty-region flush handles the reveal/hide cleanly.

## 10. Input subsystem

`src/ui/input.ts` restructured:

```ts
export type HotkeyAction =
  | "quit" | "toggle_play" | "next" | "prev"
  | "mute" | "cycle_palette" | "toggle_art" | "focus_search";

export type InputEvent =
  | { kind: "hotkey"; action: HotkeyAction }
  | { kind: "text";   char: string }
  | { kind: "edit";   op: "backspace" | "enter" | "escape" }
  | { kind: "nav";    dir: "up" | "down" | "left" | "right" }
  | { kind: "quit" };

export function startInput(
  getMode: () => "hotkey" | "text",
  onEvent: (e: InputEvent) => void,
): void;
```

### Hotkey mode map
| Key | Action |
|---|---|
| `p` | toggle_play |
| `n` | next |
| `b` | prev |
| `m` | mute |
| `v` | cycle_palette |
| `a` | toggle_art |
| `q` | quit |
| `/` | focus_search |
| Ctrl-C | quit |

### Text mode
- Printable → `{kind:"text", char}`.
- Backspace / Enter / Escape → `{kind:"edit", ...}`.
- ↑ ↓ ← → → `{kind:"nav", ...}`.
- Ctrl-C → `{kind:"quit"}`.
- All other hotkeys are emitted as plain text (typing "party" must not play/pause on `p`).

### Transport debounce
300 ms debounce on `toggle_play`/`next`/`prev`/`mute` to prevent AppleScript command pile-up.

### Mute implementation
Store `savedVolume` on first mute:
```applescript
tell application "Spotify"
  set prev to sound volume
  set sound volume to 0
end tell
```
Return `prev` to caller, kept in `App` memory. Unmute restores it.

## 11. Kinetic lyrics

### Font
8 rows × 6 cols per glyph. Only characters we need: `A-Z 0-9 space . , ! ?`. Stored as:
```ts
const GLYPHS: Record<string, string[]> = {
  'A': ['  ██  ', ' ████ ', '██  ██', '██████', '██  ██', '██  ██', '      ', '      '],
  ...
};
```
Only `' ' | '█' | '▓' | '▒' | '░'` allowed inside glyph strings (tested).

### Trigger
Each render tick reads `state.transientEnergy`:
- `energy > 0.6` → render active lyric line as 8×6 FIGlet glyphs.
- `energy ≤ 0.6` → render active lyric line as plain text.
`transientEnergy` is set to `1.0` on a transient peak and decays exponentially in `audioFeeder.ts` (half-life ~150 ms).

### Layout within lyrics cell
- Previous line (dim, plain).
- Active line — either plain or FIGlet.
- Next line (dim, plain).
- Status footer: `[ TRANSIENT PEAK -> FONT-SCALE MAX ]` when FIGlet is active, otherwise `[ KINETIC LYRICS // SYNC: RMS ]`.

## 12. Theme & palette

- UI fg: neutral light gray (truecolor `#E0E0E0` or ANSI bright white if `--no-color`).
- UI border: dim gray.
- Spectrum bars: palette cycle via `[v]`. Start palette = warm amber (`#FFB347` → `#FF6B35`). Additional palettes: cool teal, magenta/violet, monochrome.
- L/R meter gradient: `█ ▓ ▒ ░` with colour matching current spectrum palette mid-tone.
- Album art: whatever `ansilize()` produces (truecolor half-blocks) — untouched.

## 13. Testing

Unit tests (`*.test.ts` → compiled to `dist/**/*.test.js` → `node --test`):

- `player/layout.test.ts` — all regions tile exactly; middle-row halves are equal at representative sizes.
- `ui/borders.test.ts` — no `┼` produced; junction characters at expected X; corners correct.
- `ui/renderer.test.ts` — `flushDirty()` emits 0 bytes on no-change; emits one row's cursor-positioned update on single-cell change.
- `ui/bitfont.test.ts` — every glyph is 8×6; glyph chars are a subset of `{ ' ', '█', '▓', '▒', '░' }`.
- `player/state.test.ts` — `pushRecentlyPlayed`: dedup, order, max length.
- `player/search/spotifyWebApi.test.ts` — token caching, 401-retry, query encoding.
- `player/feeders/audioFeeder.test.ts` — synthetic buffers → expected peaks.
- `ui/input.test.ts` — mode switch: same key produces different events.
- Widget tests — per widget, crafted state → asserted substrings in the rendered buffer via `Renderer.debugLines()`.

Integration smoke:
- Headless App → 10 frames → captured stdout contains title bar, spectrum label, no `┼`.
- FPS budget: 60 frames < 400 ms build time.
- Resize crossing the 96×24 threshold renders cleanly in both directions.

### Manual checklist (pre-claim-done)
1. `npm run build && npm run start` from main repo. Alternate screen, no flicker.
2. Spotify playing → title/art/scrubber update within 1 s.
3. Spectrum reacts at 60 Hz; L/R meter independent.
4. `/justice` search → 8 results in ~200 ms → Enter plays.
5. `p n b m` transport works.
6. Resize through 96×24 both ways — clean.
7. Kick-drum passage → FIGlet swap + decay visible, no neighbor jitter.
8. `q` quits cleanly.

## 14. Out of scope

- Local music library, YouTube/SoundCloud integration.
- GUI-scripted scraping of Spotify Desktop's search pane.
- Mouse input.
- Persistent queue or user-maintained playlists.
- Song-theme-driven auto palette changes.
- Apple Music AppleScript path.
- Re-adding OAuth / user-scoped Spotify Web API endpoints (we only use Client Credentials, which has no user scope).

## 15. Dependencies

No new npm packages. `axios`, `dotenv`, `jimp` are already in `package.json` and cover everything in this spec.

## 16. Security notes

- `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` load via `loadEnv()` from `.env`. `.env` is not in the worktree but is present in the main repo. It is not git-tracked. If those credentials have ever been pushed to any remote, they should be rotated — git history is retained.
- Client Credentials flow has no user scope; stolen credentials expose only public search endpoints, not user data or playback of the victim's account.
- No credentials are ever written to stdout or to log files.

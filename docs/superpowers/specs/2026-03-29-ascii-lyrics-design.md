# ASCII Art Lyrics — Design Spec

**Date:** 2026-03-29
**Status:** Approved

---

## Overview

Add time-synced lyric display to the terminal visualizer. The current lyric line is rendered as large ASCII block letters using `figlet`. Three display modes cycle via the `l` key. Font size adjusts at runtime with `↑`/`↓`. When lyrics are unavailable, the feature silently degrades to the normal visualizer.

---

## Lyrics Source

Uses the unofficial Spotify internal endpoint:

```
GET https://spclient.wg.spotify.com/color-lyrics/v2/track/{trackId}
Headers:
  Authorization: Bearer {accessToken}
  app-platform: WebPlayer
```

Response shape (relevant fields):
```json
{
  "lyrics": {
    "lines": [
      { "startTimeMs": "12340", "words": "His palms are sweaty" },
      ...
    ]
  }
}
```

Fetched once per track, keyed by `trackId`. The `trackId` is extracted from the existing `SpotifyPlaybackState` response (`item.id`).

---

## Display Modes

Three modes cycle via the `l` key: `off → only → split → off`

| Mode | Lyrics region | Visualizer region |
|------|--------------|-------------------|
| `off` | none | full visualizer area (unchanged) |
| `only` | full visualizer area | hidden |
| `split` | top half of visualizer area | bottom half of visualizer area |

When `lyricsAvailable` is `false` for the current track, `lyricsMode` is forced to `"off"` silently regardless of what the user has toggled.

---

## Font Size

Five sizes cycle via `↑` (larger) / `↓` (smaller) arrow keys, clamped at ends:

| Index | figlet font | Approximate height |
|-------|------------|-------------------|
| 0 | `Banner` | ~7 rows |
| 1 | `Big` | ~6 rows (default) |
| 2 | `Standard` | ~5 rows |
| 3 | `Small` | ~4 rows |
| 4 | `Mini` | ~3 rows |

Font size controls are only active when `lyricsMode !== "off"`.

Lines wider than the terminal are truncated with `…` at the right edge — no wrapping.

---

## Line Advancement

Each render frame, `engine.ts` finds the last line in the cached lyrics array where `parseInt(startTimeMs) <= state.progressMs`. That line's `words` becomes `state.currentLyricLine`. No separate timer needed — piggybacks on the existing `progressMs` value from the Spotify poll.

Blank lyric lines (empty `words`) are passed through as-is, leaving the lyrics region blank (intentional — represents silent gaps between verses).

---

## Architecture

### New files

**`src/lyrics/client.ts`**
Fetches from the color-lyrics endpoint using the existing `getAccessToken()` from `src/spotify/client.ts`. Returns `LyricLine[]` or `null` on any error/404/401.

```ts
interface LyricLine {
  startTimeMs: number;
  words: string;
}
async function fetchLyrics(trackId: string): Promise<LyricLine[] | null>
```

**`src/lyrics/store.ts`**
In-memory cache keyed by `trackId`. Exposes `get(trackId)`, `set(trackId, lines)`, `clear()`. Prevents re-fetching the same track.

**`src/lyrics/render.ts`**
Renders the current lyric line into a `Region` on the `Renderer`. Follows the same signature pattern as `renderWavefield` and `renderSpectrum`.

```ts
function renderLyrics(
  line: string,
  renderer: Renderer,
  region: Region,
  fontIndex: number,
  theme: Theme
): void
```

Calls `figlet.textSync(line, { font: FONTS[fontIndex] })`, splits on `\n`, centers the block vertically within `region`, writes each row via `renderer.write(region.x, region.y + rowOffset, ...)`. Colors the output using `theme.normal` + `theme.reset` for consistency with the rest of the UI. Catches figlet errors silently. Truncates rows wider than `region.width` with `…`.

### Modified files

**`src/visualizer/state.ts`**
Add to `VisState`:
```ts
trackId: string;               // current track ID (for change detection + lyrics cache key)
lyricsMode: "off" | "only" | "split";
lyricsFontSize: number;        // 0–4, default 1
currentLyricLine: string;      // current line text
lyricsAvailable: boolean;      // false = no lyrics for this track
```

**`src/visualizer/engine.ts`**
- On Spotify poll: compare `playback.item.id` to `state.trackId`; if changed, update `state.trackId`, clear the lyrics store, fetch new lyrics, set `state.lyricsAvailable`
- Each render frame: walk cached lines to find last `startTimeMs ≤ state.progressMs`, set `state.currentLyricLine`
- Handle `toggle_lyrics`, `font_size_up`, `font_size_down` actions

**`renderFrame()` routing** (inside `engine.ts`):
- `lyricsMode === "off"` or `!lyricsAvailable`: pass full `layout.visualizer` region to existing `renderWavefield`/`renderSpectrum` (unchanged behavior)
- `lyricsMode === "only"`: call `renderLyrics(state.currentLyricLine, renderer, layout.visualizer, state.lyricsFontSize, theme)`, skip viz
- `lyricsMode === "split"`: call `splitVisualizerRegion(layout.visualizer)`, render lyrics in `lyrics` sub-region and viz in `viz` sub-region

**`src/ui/layout.ts`**
Add `splitVisualizerRegion(region: Region): { lyrics: Region; viz: Region }` that splits the existing visualizer `Region` vertically in half — top half for lyrics, bottom half for viz. Takes a `Region` rather than `cols/rows` so it composes cleanly with the existing `computeLayout()` output.

**`src/ui/input.ts`**
Add actions:
```ts
| "toggle_lyrics"
| "font_size_up"
| "font_size_down"
```
Map `l` → `toggle_lyrics`, `up` → `font_size_up`, `down` → `font_size_down`.

**`package.json`**
Add dependencies: `figlet`, `@types/figlet`

---

## Footer

Footer updates dynamically based on `lyricsMode`:

- `lyricsMode === "off"`: `[space] play/pause   [n] next   [p] prev   [s] mode   [l] lyrics   [q] quit`
- `lyricsMode !== "off"`: `[space] play/pause   [n] next   [p] prev   [s] mode   [l] lyrics   [↑↓] font   [q] quit`

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Fetch returns 404 / non-2xx | `lyricsAvailable = false`, mode forced to `"off"` |
| Fetch throws (network error) | Same as above |
| figlet throws on a line | Render nothing for that frame, don't crash |
| Line wider than terminal at any font | Truncate with `…` at `region.width` |
| Track changes mid-display | Store cleared, lyrics region blank until new fetch resolves |
| No active track | `lyricsAvailable = false` |

---

## Out of Scope

- Wrapping long lyric lines across multiple rows
- Displaying next/previous lyric lines (only current line shown)
- Persisting `lyricsMode` or `lyricsFontSize` across sessions
- Any official Spotify lyrics API

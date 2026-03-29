# Album Art ASCII Overlay — Design Spec

**Date:** 2026-03-29
**Status:** Approved
**Project:** audio-vis (Spotify ASCII terminal visualizer)

---

## Overview

Add a live album-art module that:
1. Fetches the current track's album cover from the Spotify CDN.
2. Converts it to colored ASCII art using `jimp` (pure JS, no native deps).
3. Displays a 4×2 character thumbnail in the existing header region (left of track name).
4. On click of the header rows (or a mapped keypress), expands to a full overlay — left half shows large ASCII art, right half shows a Spotify-style now-playing panel — with the existing plasma/wavefield animation dimmed in the background.

---

## Goals

- Stays entirely within the project's no-native-modules constraint.
- Extends the existing engine/render architecture without restructuring it.
- Degrades gracefully: if art is unavailable (network failure, no track), the header and overlay simply show nothing extra.

---

## New Files

| File | Responsibility |
|------|---------------|
| `src/album/fetcher.ts` | Fetch image bytes from a CDN URL via axios, return `Buffer` |
| `src/album/converter.ts` | jimp pixel→ASCII conversion; produces `AsciiArt` object |
| `src/album/cache.ts` | LRU cache (size 3) keyed by Spotify track ID |
| `src/visualizer/modes/albumArt.ts` | Render the full overlay mode |

---

## Existing Files Changed

| File | Change |
|------|--------|
| `src/spotify/types.ts` | Add `images: Array<{ url: string; width: number; height: number }>` to `SpotifyTrack.album` |
| `src/visualizer/state.ts` | Add `albumArt: AsciiArt \| null`, `albumArtUrl: string`, `priorMode: VisMode` |
| `src/visualizer/engine.ts` | Wire album fetch into `pollSpotify()`; add `"album-art"` dispatch in `renderFrame()`; write thumbnail to header each frame; enable ANSI mouse on start/stop |
| `src/ui/input.ts` | Parse ANSI mouse click sequences (`\x1b[Mabc`); emit `"toggle_album_art"` action when click lands on rows 0–1 |

---

## Data Structures

### `AsciiArt`

```typescript
interface AsciiArt {
  trackId: string;
  thumbnail: string[];  // length 2; each entry is 4 chars + ANSI codes (header icon)
  lines: string[];      // one entry per row; full-size art with per-char ANSI 256 color
  cols: number;         // terminal cols at conversion time (stale-check on resize)
  rows: number;         // vizH at conversion time
}
```

### Extended `SpotifyTrack.album`

```typescript
album: {
  name: string;
  images: Array<{ url: string; width: number; height: number }>;
}
```

---

## Data Flow

```
pollSpotify() [1 Hz]
  └─ reads playback.item.album.images[last].url  (last = smallest; Spotify orders largest→smallest)
  └─ if url !== state.albumArtUrl:
       cache.get(trackId)
         hit  → state.albumArt = cached; state.albumArtUrl = url
         miss → fetcher.fetch(url)
                → converter.convert(buffer, targetCols, targetRows)
                → cache.set(trackId, result)
                → state.albumArt = result; state.albumArtUrl = url

renderFrame() [30 FPS]
  ├─ if state.albumArt: write thumbnail into header rows 0–1 (left 4 cols)
  └─ if state.mode === "album-art":
       └─ renderAlbumArt(state, renderer, layout.visualizer, theme)
            ├─ renderWavefield at amplitude × 0.15   (plasma background, dimmed)
            └─ draw split overlay on top

input.ts
  └─ mouse click on rows 0–1 → action "toggle_album_art"
  └─ engine.handleAction("toggle_album_art"):
       if mode !== "album-art": state.priorMode = state.mode; state.mode = "album-art"
       else:                    state.mode = state.priorMode
```

---

## ASCII Conversion (`converter.ts`)

1. `Jimp.read(buffer)` — decode JPEG or PNG.
2. Always use the smallest image URL: `images[images.length - 1]` — Spotify returns images largest-first; the smallest is sufficient for ASCII conversion and avoids a large download.
3. Resize to `(targetCols, targetRows)`:
   - `targetCols = Math.floor(targetRows * 2.2)` — corrects for terminal character aspect ratio (chars are ~2× taller than wide).
   - Clamp to available region width.
4. Walk each pixel:
   - Luminance = `0.299R + 0.587G + 0.114B` (standard rec. 601).
   - Map to 11-level palette: `" .,:;+*#%@█"`.
   - ANSI 256 color: find nearest xterm-256 color to the pixel's RGB; emit `\x1b[38;5;{n}m` per char.
   - If `theme.noColor`: emit plain ASCII only.
5. Build `thumbnail`: resize to 4×2, same process.
6. Returns `AsciiArt`. Runs async; state updates only once fully complete (no mid-render flash).

---

## Overlay Layout (`renderAlbumArt`)

```
Visualizer region (full width × vizH):

  col 0                    col W/2-1  col W/2  col W-1
  ┌──────────────────────────┬─┬──────────────────────┐
  │  ASCII art               │ │  Now Playing         │
  │  (jimp converted,        │ │  <track name>        │
  │   centered vertically)   │ │  <artist name>       │
  │                          │ │  <album · year>      │
  │                          │ │                      │
  │                          │ │  ──●──────  3:21/5:55│
  │                          │ │                      │
  │                          │ │  ⏮  ⏸  ⏭            │
  └──────────────────────────┴─┴──────────────────────┘
  [plasma wavefield at 0.15× amplitude, rendered first as background]
```

- **Left column:** `floor(vizWidth * 0.48)` — art centered vertically within it.
- **Divider:** 1 column of `│` characters.
- **Right column:** remainder — track name, artist, album, progress bar (ASCII), control hints.
- **Plasma:** `renderWavefield` called with `state.amplitude * 0.15`; same code path, just quieter.
- **Controls:** rendered as ASCII key-hint text (`[space] [n] [p]`); actual key handling unchanged.
- **Close:** click header rows 0–1 again, or press `esc`.

---

## Terminal Resize Handling

On resize, the engine already rebuilds `renderer` and updates `state.cols/rows`. Additionally:

- If `state.albumArt` exists and `state.albumArt.cols !== newCols`, set `state.albumArtUrl = ""` to force reconversion on the next `pollSpotify` tick.

---

## Error Handling

| Failure | Behavior |
|---------|----------|
| Fetch fails (CDN unreachable, 4xx/5xx) | `state.albumArt` stays `null`; no icon; overlay unavailable |
| `Jimp.read` throws (corrupt image) | Caught, `state.albumArt` stays `null`; same no-op behavior |
| No track playing | `state.albumArtUrl = ""`; thumbnail cleared |
| `images` array empty | Treat as no-art; no fetch attempted |

No crash in any case. Errors are silently swallowed (consistent with how `pollSpotify` handles network errors today).

---

## Dependencies

Add one package:

```
jimp  — pure-JS image decode + resize; no native compilation required
```

No other new dependencies. `axios` (already present) handles the CDN fetch.

---

## Testing

Manual checklist (no automated tests, consistent with existing project):

- [ ] Thumbnail appears in header after track loads
- [ ] Thumbnail updates when track changes
- [ ] Click header rows 0–1 → overlay opens
- [ ] `esc` or second header click → overlay closes, returns to prior mode
- [ ] Plain `[a]` keypress as alternative toggle; footer hint updates to include `[a] album art`
- [ ] `--no-color` / `--ascii-safe` flags → plain chars, no ANSI codes
- [ ] Resize terminal while overlay open → art reconverts at new size
- [ ] Network down → no crash; no thumbnail; overlay click is no-op
- [ ] Fast track skipping → cache prevents redundant fetches

---

## Out of Scope

- Animated album art (no GIF support).
- Touchpad/scroll gesture in overlay.
- Saving ASCII art to file.

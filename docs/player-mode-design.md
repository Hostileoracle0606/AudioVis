# Player Mode — Design Doc

Status: **design finalised, implementation pending**
Owner: audio-vis
Last revised: 2026-04-18

---

## 1. Intent

Replace the current mode-carousel (spectrum / scroll / wavefield / album-art) as the *primary* surface with a single composed interface that looks and feels like a dedicated piece of Teenage-Engineering-style hardware: a record player chassis on the left, a lyrics + waveform module on the right, a centred search field floating as chrome above them, and the existing reactive visuals dimmed to ~15% intensity as the background plate.

The old modes aren't deleted — they still run as background plates, and can be fullscreened for debugging — but the user-facing default becomes the composed player view.

## 2. Design language — Teenage Engineering in ASCII

Rules the whole surface obeys. These are non-negotiable; if a component violates one it looks cheap.

| Rule | How it shows up |
|---|---|
| **Lowercase labels** | `tempo`, `volume`, `play`, `search` — never `TEMPO` or `Play` |
| **Catalog-number chrome** | `audio·vis ◦ 042` in chassis header, `· · track 042 · ·` in status |
| **Thin rounded frames** | `╭ ─ ╮ │ ╰ ─ ╯` everywhere. Never `╔═╗ ║ ╚═╝`. Box-drawing weight is uniform. |
| **One accent per frame** | Song-theme `accent` is used for *one* thing: the now-playing cartridge position **or** the active beat flash **or** the focused control — never two at once |
| **Muted palette** | Chassis, frames, labels, static copy: `song.dim`. Live data: `song.normal`. Emphasis: `song.bright`. Accent: reserved, as above. |
| **Monospace-aligned readouts** | BPM, time, rpm — always same column widths, leading-zero padded: `01:24 / 03:47`, `120 bpm`, `33⅓ rpm` |
| **◉ for knobs, ▷ for transport, ✦ for spindle/label marks** | Consistent glyph vocabulary across all controls |
| **Dotted separators** | `· ·` between status fields, not `|` or `/` |
| **No skeuomorphic shadows** | Flat. Depth comes from palette tiering, not from drawn shadow characters. |

## 3. Wireframe (80 × 32 reference — scales fluidly)

```
                         ╭─ search ─────────────────────── q ─╮
                         │                                    │
                         ╰────────────────────────────────────╯

╭─ audio·vis ◦ 042 ──────────────────────────╮  ╭─ lyrics ───────────────╮
│                                            │  │                        │
│  ◉ tempo                      ◉ volume     │  │   · you can't go back  │
│                                            │  │   · to yesterday        │
│        · · · · · · · · · ·                 │  │   ✦ only forward nights │
│      ·     groove rings     ·              │  │   · if you know          │
│    ·   ·  ── ── ── ── ── ·   ·             │  │   ·                     │
│   ·  ·   ─  ╭──────╮   ─  ·  ·             │  │                         │
│   ·  ·   ─  │side a│   ─  ·  ·   ◯         │  ├─ waveform ─────────────┤
│   ·  ·   ─  │ ✦ 33⅓│   ─  ·  · ╱           │  │                         │
│   ·  ·   ─  ╰──────╯   ─  · ╱ ·             │  │     ∿∿∿∿∿∿∿∿∿∿∿∿        │
│    ·   ·  ── ── ── ── ╱    ·               │  │    ∿    ∿∿∿∿    ∿       │
│      ·                 ▐ ·                 │  │  ∿∿∿∿  ∿    ∿  ∿∿∿∿     │
│        · · · · · · · · · ·                 │  │                         │
│                                            │  │                         │
│  ╭─ screen ──────────╮  ╭─ ))) ))) ))) ╮   │  │                         │
│  │ ▓▒░ album art ░▒▓ │  │ ))) ))) )))  │   │  │                         │
│  │ ░▒▓ via ansilizer │  │ ))) ))) )))  │   │  │                         │
│  │ ▓▒░             ░ │  │ ))) ))) )))  │   │  │                         │
│  ╰───────────────────╯  ╰──────────────╯   │  │                         │
│                                            │  │                         │
│  · · track 042 · · 120 bpm · · 01:24/03:47 │  │                         │
│                                            │  │                         │
│  · rec    ◉ speed    ◉ line       ▷ play   │  │                         │
╰────────────────────────────────────────────╯  ╰─────────────────────────╯
```

Layers (back to front):
1. Existing reactive visual (spectrum / scroll / wavefield) at ~15% luminance — dimmed via `song.dim`-only palette
2. Player chassis (left) and lyrics/waveform module (right)
3. Centred search field — floats above both, not contained in either

## 4. Component breakdown

### 4.1 Chassis
- Frame: rounded thin box, `song.dim`
- Header: `audio·vis ◦ 042` centred in the top border, where `042` is a stable track hash (`hashTrackId(trackId) % 1000`, zero-padded). Gives TE catalog-number feel.
- Interior uses two internal rules: rounded sub-frames for `screen` and `))) )))` grille, plus a dotted horizontal rule above the control strip.

### 4.2 Turntable
- **Platter**: two concentric rings of dots (`·`) marking the platter edge
- **Grooves**: 5-6 arcs of `─` chars between edge and label, visually concentric. Subtle drift: every ~800ms one groove dims-to-brightens in sequence to suggest rotation without full animation load.
- **Label**: rounded inner box, contents = `side a / track NNN / ✦ · 33⅓ / audio vis`, coloured `song.dim`
- **Spindle**: `✦` dead centre, inside the label
- **Rotation indicator**: one groove char is swapped to `song.accent` and cycles around the outer ring at a rate = `33⅓ rpm` (scaled down — one full cycle every ~1.8s real time). This is the *only* accent-coloured mark on the turntable.
- On pause: rotation indicator freezes, spindle dims, grooves don't drift.

### 4.3 Tonearm
- **Pivot**: `◯` at top-right of the turntable area, `song.normal`
- **Arm**: diagonal line from pivot to cartridge, drawn with `╱` chars. Angle maps linearly from `progressMs / durationMs` — 0% progress = arm parked off-platter (steep angle, off to the right), 100% = arm at label edge (shallow angle, near centre).
- **Cartridge**: `▐` at the arm's end, **this is the one accent-coloured glyph when music is playing** (`song.accent`). On pause → `song.dim`.
- Arm animation is driven by `progressMs`, not by DSP — it moves smoothly over the whole track, giving the user a hardware-scrubber readout without needing a timeline bar.

### 4.4 Corner knobs
- `◉ tempo` top-left, `◉ speed` / `◉ line` bottom-middle, `◉ volume` top-right
- `◉` char + lowercase label directly under it. No position-indicator dot on the knob itself — knobs are decorative chrome, their *value* is the live readout in the progress strip.

### 4.5 Screen (album art)
- Rounded sub-frame, aspect roughly 2:1 in character cells (~20 cols × 8 rows)
- Contents: ASCII-colour rendering of the current Spotify track's album art
- **Renderer: `ansilizer`** — see §6 for rationale
- Label `screen` in the sub-frame header, `song.dim`
- On no-art state: frame retains, interior shows a single centred `audio·vis` wordmark in `song.dim`

### 4.6 Speaker grille
- Rounded sub-frame beside the screen
- Contents: a lattice of `)))` triads, 3-4 rows, coloured `song.dim`
- **Reactive behaviour**: on each pulse onset (`lastPulseMs` recent), one random grille row pops to `song.bright` for ~200ms, decays back. Feels like the speaker is "pushing" on bass hits, without the grille ever moving geometrically.

### 4.7 Progress strip
- One line, dotted separators: `· · track NNN · · BPM bpm · · MM:SS / MM:SS · · 33⅓ rpm · ·`
- All text `song.dim` except `MM:SS` current-time, which is `song.normal`
- `BPM` field hidden when `feats.confidence < 0.3`

### 4.8 Control strip
- Bottom interior row
- `· rec    ◉ speed    ◉ line       ▷ play`
- `rec` is non-functional chrome (TE aesthetic demands it — real record player decks have a record button even when you'll never use it)
- `▷ play` toggles to `▯▯` (pause glyph) when `isPlaying` is false
- All glyphs `song.dim`, the play/pause glyph promotes to `song.normal` when focused (future keybinds)

### 4.9 Side module — lyrics panel (top)
- Rounded sub-frame, label `lyrics`
- Contents: 4-6 lines of text
- Format: each line prefixed `·`; current line prefixed `✦` and coloured `song.bright`; prior/next lines `song.dim`
- **Source**: lrclib.net fetched by `trackName + artistName` on track change, cached by trackId. When no lyrics: fall back to a metadata marquee — artist name, album name, release year, play count — one fact per line, cycling every ~4s.

### 4.10 Side module — waveform panel (bottom)
- Rounded sub-frame, label `waveform`
- Contents: three overlapping sinusoids (the original sketch's interference-pattern look) drawn with `∿` and `~` chars
- Phase driven by `songFeatures.tempoPhase`, amplitude scaled by `state.amplitude`, with three layers at different spatial frequencies per `songTheme.waveLayerBias` (mirrors the existing `wavefield` motion-blur concept but in a strictly horizontal panel).
- Colour: outer band `song.dim`, middle band `song.normal`, crest (single row at max) `song.bright`. Accent reserved for beat flash only (one-row sweep across, 100ms, on `lastPulseMs` update).

### 4.11 Search field
- **Centred horizontally** above the two modules, floating as chrome — **NOT** contained in the player chassis
- Rounded thin frame, ~40 cols wide × 3 rows tall, label `search`, right-side hint `q`
- Focus cycles with `/` key (planned); type to filter Spotify; enter to select. For v1 this is **decorative only** — the frame renders and accepts no input — but placement and framing are final.
- When focused: frame recolours from `song.dim` → `song.bright`, caret `▌` blinks inside.

## 5. Layering

Z-order, bottom to top:

1. **Background plate** — current active legacy mode (wavefield / scroll / spectrum), rendered first, into the full viewport, with its palette forced to `song.dim` and accent colours suppressed. The `renderer` will still write over it — no transparent compositing; the player and side module simply overwrite their cells.
2. **Player chassis** (left pane) — occupies roughly 55-60% of viewport width
3. **Lyrics/waveform module** (right pane) — remaining width
4. **Search field** — centred, drawn last so it sits on top of both panes if there's any overlap at narrow widths.

At narrow widths (<110 cols), the side module collapses below the player instead of beside it; the search field stays centred. Below 80 cols, we fall back to legacy mode rendering (out of scope for player mode).

## 6. Ansilizer integration

### 6.1 Album art — required

The **album art `screen` sub-panel uses [`ansilizer`](https://www.npmjs.com/package/ansilizer)** for image→ANSI conversion, replacing the current `src/album/converter.ts` path (or rather, `converter.ts` becomes a thin adapter around ansilizer).

Rationale:
- Higher-fidelity colour mapping than our current density-ramp approach — ansilizer handles 24-bit truecolor and dithering properly, so album art actually looks like album art rather than a grey density plot.
- Supports arbitrary output dimensions — we size it to exactly the `screen` sub-frame interior, no manual letterbox logic.
- Handles HEIC/JPEG/PNG via Jimp (which we already have) → ansilizer → string.

Integration shape:
```ts
// src/album/converter.ts (rewritten)
import ansilizer from "ansilizer";
export async function imageToAscii(buf: Buffer, cols: number, rows: number): Promise<AsciiArt> {
  const ansi = await ansilizer.toAnsi(buf, { cols, rows, mode: "truecolor" });
  return { lines: ansi.split("\n"), width: cols, height: rows };
}
```

Dependency note: **add `ansilizer` to `package.json`** dependencies. Keep `jimp` for fetch+decode; pipe the decoded bitmap into ansilizer.

### 6.2 Record-player UI — evaluation

User asked for evaluation rather than a decision. **Recommendation: do NOT use ansilizer for the chassis/turntable/controls.**

Pros of using ansilizer for the player UI:
- Could generate the chassis as a pre-rendered PNG mock and have ansilizer ASCII-ify it, letting designers iterate in a real image editor rather than in string literals.
- Consistent colour handling with the screen sub-panel.

Cons (why I'd hold off):
- The player UI is **reactive per-frame** — tonearm angle, rotation indicator, grille pulses, progress strip, cartridge accent colour. Every one of those changes every frame or every beat. Re-rasterising a PNG and piping it through ansilizer 30×/sec is wasteful and slow (image decode + quantisation per frame) vs. writing 50 cells directly.
- TE aesthetic relies on *exact* box-drawing glyph choices and *exact* one-accent discipline. Image-to-ASCII quantisation will round `╭` to `F` or `r` in low-colour modes and compromise the chassis look.
- We lose the semantic structure — if the chassis is a bitmap, we can't cheaply overlay a dynamic tonearm; we'd composite tonearm cells over an ansilizer-rendered background, at which point we've written the direct-cell code anyway.

**Conclusion**: hand-authored `renderer.write(col, row, cell)` calls for the chassis and side module; ansilizer only for the album-art screen interior (which is the one place an actual image is the source of truth).

This decision is revisitable if the chassis starts containing static decorative imagery (TE-style product shot, patterned backplate, etc.).

## 7. Data flow

```
Spotify poll (every 2s) ──▶ state.trackName / albumArtUrl / progressMs
                             │
                             ▼
  Track change? ──▶ fetch album art (jimp) ──▶ ansilizer ──▶ state.albumArt
                ──▶ fetch lyrics (lrclib)   ──▶ state.lyrics[]
                ──▶ reset SongFeatureTracker, clear particles/rings

Audio frame (30fps) ──▶ features (low/mid/high/pulse) ──▶ state
                    ──▶ SongFeatureTracker.update ──▶ state.songFeatures
                    ──▶ rebuild songTheme every 90 frames

Render frame (30fps):
  1. renderBackgroundPlate(state, region_full, theme_dimmed)
  2. renderPlayerChassis(state, region_left)
     ├─ renderTurntable(state, region_platter)
     ├─ renderTonearm(state, region_platter)
     ├─ renderScreen(state.albumArt, region_screen)
     ├─ renderGrille(state, region_grille)
     ├─ renderProgressStrip(state, region_strip)
     └─ renderControls(state, region_controls)
  3. renderSideModule(state, region_right)
     ├─ renderLyrics(state.lyrics, state.progressMs, region_lyrics)
     └─ renderSideWave(state, region_wave)
  4. renderSearch(state.searchQuery, state.searchFocused, region_search_centred)
```

## 8. State additions

```ts
// src/visualizer/state.ts
export type VisMode = "player" | "wavefield" | "scroll" | "spectrum" | "album-art";

interface VisState {
  // ... existing fields

  // player mode
  backgroundMode: "wavefield" | "scroll" | "spectrum"; // which plate to run behind
  lyrics: LyricLine[] | null;   // { ms, text }[], from lrclib
  currentLyricIdx: number;
  searchQuery: string;
  searchFocused: boolean;
  platterPhase: number;         // 0..1, wraps at 33⅓ rpm scaled
  grillePulseRow: number;       // -1 if none; row index that's currently flashing
  grillePulseUntilMs: number;
}
```

Player mode becomes the **default** `VisMode` on first launch.

## 9. Key-bindings

| Key | Action |
|---|---|
| `/` | Focus search field |
| `esc` | Unfocus search |
| `space` | Play/pause (Spotify API) |
| `[` `]` | Previous / next background mode |
| `f` | Fullscreen current background mode (exits player composition) |
| `q` | Quit |

Out of scope for v1: lyrics scrubbing, tonearm drag-to-seek.

## 10. Open questions

- **Ansilizer for the chassis**: recommending no (see §6.2). User to confirm before implementation; if they want us to try it, we'd prototype one frame and compare visually.
- **Lyrics provider fallback order**: lrclib.net → genius (unlicensed scraping risk) → metadata marquee. Start with lrclib-only and marquee fallback; add genius only if coverage is poor.
- **Background plate selection**: cycle automatically per-track, or stick to one until manually changed? Proposal: stick to one, user cycles with `[` `]`; remember last choice across sessions.

## 11. Implementation order (for when we start coding)

1. Add `ansilizer` dep; rewrite `src/album/converter.ts` as a thin adapter; verify current album-art mode still renders.
2. Add `"player"` to `VisMode`; add new state fields; default to `"player"`.
3. `src/ui/layout.ts` — compute the three regions (left chassis, right module, centred search) for a given cols×rows.
4. `src/visualizer/modes/player/chassis.ts` — static frame + header + control strip.
5. `chassis/turntable.ts` — grooves + label + spindle + rotating accent pip.
6. `chassis/tonearm.ts` — progress-driven angle + cartridge.
7. `chassis/screen.ts` — render `state.albumArt` into the screen sub-frame region.
8. `chassis/grille.ts` — lattice + beat-reactive row flash.
9. `chassis/progress.ts` — dotted status strip.
10. `side/lyrics.ts` — current-line highlighting + marquee fallback.
11. `side/wave.ts` — 3-layer sinusoid with tempo-phase drive.
12. `search.ts` — centred floating frame (decorative for v1).
13. `renderPlayer(state, renderer, region, theme)` composes the above and dim-renders the chosen background plate first.
14. Wire into `engine.ts` switch on `VisMode`; integrate `lrclib` fetch on track change.
15. Type-check, run against a live Spotify session, iterate on palette tiering until the one-accent rule visually holds.

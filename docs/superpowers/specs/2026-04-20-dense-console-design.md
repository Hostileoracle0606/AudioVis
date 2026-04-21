# TUI.AMP — Dense Console Redesign

Status: **design approved, implementation pending**
Owner: audio-vis
Date: 2026-04-20

---

## 1. Intent

Replace the current three-column top row (`album art | now playing | recently played`) with a single **dense console** that honors dot-matrix / Teenage-Engineering design language. The redesign solves three concrete problems with the current UI:

1. Album art is too small to read as art (~30×7 cells, barely recognisable)
2. The "recently played" panel is dead weight (static list, rarely glanced at, no interaction)
3. Now Playing and active lyrics get lost in a flat visual hierarchy where every element has the same weight

The new layout packs every region with parallel redundant readouts (gauge + numeric + LED), uses dot-matrix texture (`·` `⣿` `⠛` `⣀`) as the primary visual material, renders the album art at ~2× current size inside a framed "screen," and replaces "recently played" with an 8-pad queue grid that doubles as keyboard shortcuts (`1`–`8` to jump-play).

The scheme is reactive to audio in a disciplined way: scale contrast and accent-color monopoly keep the active lyric + now-playing title as the eye's landing points, while chrome animations (sync LED strobe, peak-hold dots, spectrum bass flash) give the interface a hardware-deck feel without competing with the hero content.

## 2. Design language

Rules the whole surface obeys. Non-negotiable.

| Rule | How it shows up |
|---|---|
| **Dot-matrix as primary material** | `·` `⣿` `⠛` `⠿` `⣀` used liberally for texture, fills, borders' accent rows, LEDs, progress |
| **Rounded thin frames** | `╭─╮ │ ╰─╯` for all panel borders. Never `╔═╗ ║ ╚═╝`. Corners soft, lines single-weight. |
| **Dotted interior rules** | Sub-divide panels with `···· label ·····` horizontal rules, not `─` lines |
| **Lowercase catalog labels** | `[ now · track 042 ]`, `[ screen · 042 ]` — never `[ NOW PLAYING ]`. Numeric track ID `042` = `hashTrackId(trackId) % 1000`, zero-padded |
| **Scale contrast for hierarchy** | Exactly **one** element renders in bitfont (big-type): the active lyric line. Nothing else. This makes the active lyric the unique landing point for the eye. The now-playing title gets attention instead via hero fg color + `▸` marker + top-of-panel position. |
| **One accent per frame** | Accent color is held by one element at a time: default = active lyric; borrowed ≤150ms by sync LED + sub-bass bin on transient; borrowed ≤200ms by peak/clip LEDs on level events. Everything else is dim/normal. |
| **Three-tier palette** | Tier 1 hero (`theme.fg`), Tier 2 live (`theme.meter`), Tier 3 chrome (`theme.dim`). Accent (`theme.accent`) is rationed per above. |
| **Consistent glyph vocab** | `◦` status LEDs, `●` active/peak hold, `◉` knobs, `▷ ■ ◉ ⟲` transport, `✦` spindle/catalog marks, `▮/▯` for gauge segments |

Explicitly departs from the prior [docs/player-mode-design.md](../../player-mode-design.md) in that the turntable chassis metaphor is dropped in favor of a console/rack metaphor. The dot-matrix aesthetic is the new common ground.

## 3. Wireframe (target ~108 cols × ~30 rows; scales fluidly down to 96×24)

```
╭─[ TUI·AMP ◦ 042 ]──────────────────────[ / search ]────────────[ cpu·19.7 · rms·0.73 · lufs·-8 · 48k ]─╮
│ ◦in● ◦out● ◦sync○ ◦midi● ◦mon● ◦lim○   ·······························   ◦ pgm 01 ◦ bnk a ◦ bpm 118  │
├────────────────────────────────────────┬────────────────────────────────┬──────────────────────────────┤
│ ╭─[ screen · 042 ]─────────────────────╮│╭─[ now · track 042 ]──────────╮│╭─[ pads · queue 1/8 ]────────╮│
│ │⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿││ ▸ killer on the loose       ││ ┌01──┐┌02──┐┌03──┐┌04──┐   ││
│ │⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿││ ◦ rex vijayan               ││ │●●●●││··●·││●●·●││●●●·│   ││
│ │⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿│├───· track dna · lrclib ──────┤│ │●●●●││·●●·││●●●●││●●·●│   ││
│ │⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿││ bpm 118 · key am · -8 lufs  ││ │●●●●││·●●·││●●●●││●●●●│   ││
│ │⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿││ eng ▮▮▮▮▮▯▯ 72  val ▮▮▯▯▯▯▯ ││ └klr──┘└phn──┘└gen──┘└lmn──┘│
│ │⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿││ dan ▮▮▮▮▯▯▯ 58  aco ▮▮▮▯▯▯▯ ││ ┌05──┐┌06──┐┌07──┐┌08──┐   ││
│ │⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿│├───· meter strip ─────────────┤│ │●●●●││··●·││·●·●││●·●·│   ││
│ │⠛⠛⠛⠛⠛⠛⠛⠛⠛⠛⠛⠛⠛⠛⠛⠛⠛⠛⠛⠛⠛⠛⠛⠛⠛⠛⠛⠛⠛⠛⠛⠛││ L ⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠿⠟ 73% ││ │·●●·││●●●●││·●●·││●●●●│   ││
│ ╰──────────────────────────────────────╯│ R ⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠿⠟    68% ││ │·●●·││●●·●││·●●·││·●●·│   ││
│ ◦ ansilize · 2×4 braille · 30×8 dots   ·│ ◦peak -2.1 ◦clip 0 ◦lim 0   ││ │●●●●││●●●●││●●●●││●●●●│   ││
│ ● peak hold  · ● over  · ● lim         ·│├───· transport ──────────────┤│ └mid──┘└tnr──┘└vxl──┘└oko──┘│
│ ◦ rms 0.73  ◦ lufs -8  ◦ peak -2.1 ····│ [▷ play] [■ stop] [◉ rec] [⟲]││ ▸ pad 01 · killer · 118 bpm  │
│ ·······································│ ◉ tempo  ◉ vol    ◉ mix  ◉ eq││ ·····························│
│                                         │ pgm 01 · bnk a · 118bpm · am ││ ╰─────────────────────────────╯
├─────────────────────────────────────────┴──────────────────────────────┴──────────────────────────────┤
│ ╭─[ lyrics · sync rms 0.73 · lrclib ]──────────────╮ ╭─[ spectrum · 16b · amber · peak -2.1 dbtp ]───╮│
│ │ ·  just the rain · no escaping the flood          │ │ hz 62 125 250 500  1k  2k  4k  8k 16k        ││
│ │                                                   │ │    ⣀  ⣄  ⣦  ⣶  ⣾  ⣿  ⣿  ⣿  ⣿                ││
│ │ ● ███████████████   ██████████████████            │ │    ⣿  ⣿  ⣿  ⣿  ⣿  ⣿  ⣿  ⣿  ⣿   ← peak      ││
│ │   FEELING ONE  WITH THE TRUTH                     │ │    ⣿  ⣿  ⣿  ⣿  ⣿  ⣿  ⣿  ⣿  ⣿                ││
│ │ ███████████████   ██████████████████              │ │    ●  ●  ●  ●  ●  ●  ●  ●  ●  peak-hold     ││
│ │ ·  i'm a killer on the loose · no escaping        │ │ ─── 2s ─── ◦ reset ◦ tilt ◦ a-weight ◦      ││
│ ╰───────────────────────────────────────────────────╯ ╰────────────────────────────────────────────────╯│
├───────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 01:32 ⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⠿⠛⠛⠿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿ 03:02│
│ [p]lay [n]xt [b]ck [m]ute [v]is [a]rt [/]srch [1-8]pad [q]uit    ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ●  │
╰───────────────────────────────────────────────────────────────────────────────────────────────────────╯
```

Active-lyric illustration above is schematic — the actual render uses `bitfont.renderBigLine()` output compressed via half-block packing; see §5.2 for geometry.

## 4. Layout geometry

### 4.1 Regions

Replaces [src/player/layout.ts](../../../src/player/layout.ts) `computeAppLayout`. New constraint tree:

```
outer (cols × rows)
 └─ inner (cols-2 × rows-2)
    ├─ titleBar     length 1
    ├─ sep1         length 1    (├───── junctions downward for 3-col top row)
    ├─ topRow       length 15   (was 10; enlarged to host bigger art + full now+pads)
    │   ├─ screenR    fill     (~34 cols at 108 wide — album art framed)
    │   ├─ nowR       length 34 (fixed; holds bitfont-title + track-dna + meters + transport)
    │   └─ padsR      length 34 (fixed; 2×4 dot-pad grid + pad status footer)
    ├─ sep2         length 1    (├───┴───┴───┤ junctions)
    ├─ middleRow    fill        (lyrics big-type panel + spectrum; min 8 rows after sep)
    │   ├─ lyricsR    percent 55  (slightly wider than spectrum to host bitfont)
    │   └─ spectrumR  percent 45
    ├─ sep3         length 1
    └─ bottomRow    length 2
        ├─ scrubR     length 1    (progress Braille waveform)
        └─ keysR      length 1    (legend + LED strip)
```

### 4.2 Constants

```ts
export const MIN_COLS = 108;        // raised from 96 — dense layout needs the width
export const MIN_ROWS = 28;         // raised from 24
const TOP_ROW_H     = 15;
const MIDDLE_MIN_H  = 8;
const BOTTOM_ROW_H  = 2;
const NOW_W         = 34;
const PADS_W        = 34;
```

### 4.3 Junctions

- `sep1`: two `┬` junctions (below screen/now and below now/pads)
- `sep2`: two `┴` matching sep1 + one `┬` for the middle-row lyrics/spectrum divider
- `sep3`: one `┴` for the middle-row divider

## 5. Components

### 5.1 Screen panel (album art) — `widgets/albumArt.ts` (updated)

- Framed sub-panel inside `screenR`. Label `[ screen · NNN ]` (NNN = track catalog hash).
- Art rendered at `region.width - 4` × `region.height - 4 - FOOTER_H` where `FOOTER_H = 4`.
- Existing `ansilize` pipeline in [src/album/converter.ts](../../../src/album/converter.ts) — tweak the `playerCols`/`playerRows` calculation to target the new dimensions (~30×8 at 108×30 terminal).
- **Footer strip** (4 rows beneath the framed screen):
  - Row 1: `◦ ansilize · 2×4 braille · {cols}×{rows} dots` — static metadata
  - Row 2: `● peak hold  · ● over  · ● lim` — three LEDs, reactive (see §6.3)
  - Row 3: `◦ rms {0.00}  ◦ lufs {-NN}  ◦ peak {-N.N} dbtp` + `····` fill to right edge
  - Row 4: full-width `····` dot texture
- **Reactive behaviour**: on `transientPeak`, the bottom Braille row of the art itself (`⠛⠛⠛...`) re-colors from `theme.dim` → `theme.accent` for one frame (~16ms) then returns. Reads as a scanline pulse.
- On pause: whole panel dims one tier (multiply brightness by 0.7 via palette shift, or explicit dim pass).
- `artCellMode === "blank"` and `"vu"` preserved from current impl.

### 5.2 Now panel — `widgets/nowPlaying.ts` (rewritten)

Fixed-width (`NOW_W = 34`), four stacked sub-sections separated by dotted rules:

1. **Title block** (2 rows)
   - Row 0: `▸ {trackName}` rendered in bitfont half-block compression (see §5.6) — 4 terminal rows tall when the track title fits; **overlaps with rows below if long**, so title is scroll-truncated to fit the 2-row allocation in compressed form, or we use a single-row marquee of regular text as fallback when height is tight.
   - Row 1: `◦ {artistName}` regular text, `theme.dim`
   - **Decision:** title at **1× size** (regular text, `theme.fg` bold-equivalent — truecolor bright) in the fixed panel. Big-type bitfont is reserved for the **active lyric only** (§5.4) to preserve scale-contrast uniqueness. Rationale: two bitfont elements would split attention and dilute hierarchy. The title gets attention via position (top of panel), color (hero fg), and the `▸` glyph marker.
2. **Track DNA strip** (3 rows)
   - Rule: `├───· track dna ──────────────┤`
   - `bpm NNN · key XXX · -N lufs` (one row)
   - `eng ▮▮▮▮▮▯▯ NN   val ▮▮▯▯▯▯▯ NN` (one row)
   - `dan ▮▮▮▮▯▯▯ NN   aco ▮▮▮▯▯▯▯ NN` (one row)
   - **Values are deterministic from `trackId`** — not from any audio-features API (out of scope this cycle). A pure function `computeDna(trackId: string): TrackDna` hashes the track ID (djb2 or FNV-1a) and slots bits into plausible ranges:
     - `bpm`: 72–168 (from bits 0–6)
     - `keyIndex`: 0–11 → mapped to `c / c# / d / ...` (bits 7–10)
     - `keyMode`: `maj` / `min` (bit 11)
     - `lufs`: -4 to -19 (bits 12–15)
     - `energy`, `valence`, `danceability`, `acousticness`: 0–100 (bits 16–23, 24–31, then re-hash for last two)
   - Because the function is pure of `trackId`, values are **stable per track** (metadata doesn't jitter mid-song) and **varied across tracks** (different hashes → different values). Same track plays tomorrow → same DNA.
   - When the Spotify Web API audio-features integration lands later (§10), the call site in `renderNowPlaying` switches from `computeDna(trackId)` to reading real values off `state.nowPlaying.audioFeatures`. Single-point swap. The gauge rendering code doesn't care where the values came from.
3. **Meter strip** (3 rows)
   - Rule: `├───· meter strip ─────────────┤`
   - `L {braille-bar} NN%` — uses the existing ansilize style with peak-hold dot
   - `R {braille-bar} NN%`
   - `◦peak -N.N ◦clip N ◦lim N  ◦dn N` — numeric readouts
4. **Transport strip** (3 rows)
   - Rule: `├───· transport ──────────────┤`
   - `[▷ play] [■ stop] [◉ rec] [⟲]` — four control chips; `▷/▯▯` swap on play state
   - `◉ tempo  ◉ vol    ◉ mix  ◉ eq` — four decorative knobs
   - `pgm NN · bnk x · NNNbpm · XX` — catalog readout

### 5.3 Pads panel — new `widgets/queuePads.ts` (replaces `recentlyPlayed.ts`)

Fixed-width (`PADS_W = 34`). 2×4 grid of pad tiles plus a footer.

- Each pad is 8 cols × 5 rows:
  ```
  ┌01──┐
  │●●●●│
  │●●●●│
  │●●●●│
  │●●●●│
  └klr──┘
  ```
  - Header `┌NN──┐` = pad index (01-08)
  - Interior `4×4` dot grid = **fingerprint**: binarised 4×4 downsample of the track's album art (threshold at median brightness). Computed once per track in the album-art pipeline.
  - Footer `└NNN──┘` = first 3 chars of track title
- **Grid layout**: pads 01-04 top row, 05-08 bottom row, with 0-col gap between pads.
- **Active-pad state**: the pad matching the currently-playing track gets:
  - Header rendered in `theme.accent` instead of `theme.dim`
  - Outer border characters swapped to doubled-weight (still rounded: `╭─╮`)
- **Reactive**: active pad's dot fingerprint bumps `theme.dim` → `theme.fg` for one frame on `transientPeak`, then returns
- **Footer row**: `▸ pad NN · {shortName} · {bpm}bpm` — reflects active pad
- **Trailing dotted rule**: below footer, one row of `·····` fill to panel edge

**Keyboard**: `1`–`8` play pad at that slot (wire into `App.handleHotkey`).

**Data source**: seed from `state.recentlyPlayed` for now (the last 8 tracks, most-recent-first), with the currently-playing track always pinned to pad 01. Future: switch to Spotify queue API if/when wired.

### 5.4 Lyrics panel — `widgets/lyrics.ts` (rewritten) + new `widgets/bigLyric.ts`

Lyrics panel is now **55%** wide. Content split:

- **Prev line** (1 row): previous lyric in `theme.dim`, truncated to panel width
- **Active line** (4 rows): rendered by `bigLyric.ts`:
  - Input: current lyric text (lowercased for aesthetic — bitfont uppercases internally, but we render as lowercase-source → all-caps big text, consistent with TE catalog style which uses lowercase labels but caps-display)
  - Uses `renderBigLine()` from [src/ui/bitfont.ts](../../../src/ui/bitfont.ts) → 8-row pixel grid
  - **Half-block compression**: pack every 2 pixel rows into 1 terminal row using `▀▄█ ` glyphs. 8 pixel rows → 4 terminal rows. Each `█` = both halves on, `▀` = top half, `▄` = bottom half, ` ` = both off.
  - Color: `theme.accent` (hero accent target when no transient event is stealing)
  - Left margin: `●` glyph column at panel inset — marks active-line baseline
  - If the rendered width exceeds panel width, **scroll horizontally** at a rate proportional to BPM (or a constant 2 cells/sec fallback). Start from left, pause 500ms at end, wrap.
- **Next line** (1 row): upcoming lyric in `theme.dim`
- **Trailing dotted row** (1 row): `·····` fill — visual baseline

Total rows: 1 + 4 + 1 + 1 = **7 rows minimum** — matches `middleRow` minimum height.

**On transient peak while active lyric is shown**: apply a 1-frame brightness boost by swapping `theme.accent` for a brighter variant (256-color palette bump of +2, clamped). Reads as the lyric "singing."

### 5.5 Spectrum panel — `widgets/spectrum.ts` (updated)

- Label: `[ spectrum · 16b · {palette} · peak {-N.N} dbtp ]`
- Row 0: `hz 62 125 250 500 1k 2k 4k 8k 16k` — frequency bin labels
- Rows 1-N: existing bar render, but **add peak-hold**: per bin, track max magnitude over last 1.5s; render a `●` glyph at that row in accent color (stays on top as bars decay). Decay: linear 2 cells/100ms after hold.
- **Bass-bin accent**: bin 0 (62Hz) borrows `theme.accent` for one frame when `transientEnergy > 0.6` — the only accent event on this panel.
- Footer row: `● peak-hold  ─── 2s ─── ◦ reset ◦ tilt ◦ a-weight` — chrome labels for the hold/weighting (static; toggles are future work, labels present for visual density).

### 5.6 Progress bar — `widgets/controls.ts` (updated)

Replaces the current simple block-fill bar with a **Braille waveform envelope**:

- Ring buffer `state.progressEnvelope: Float32Array` — one entry per track-progress slice. At 108 cols wide − 14 (for timestamps + padding) = ~94 slices. Each slice = `durationMs / 94` ms long. The FFT feeder writes the max-RMS observed during each slice as the song plays.
- Render: for each column, convert the stored envelope value (0..1) into a Braille glyph by mapping to the 8 Braille heights (`⣀⣄⣆⣦⣶⣾⣿` for progressive fill from bottom). Columns past the current progress render as `·` (dim). Current-column playhead is `theme.accent`.
- Format: `{mm:ss} {waveform} {mm:ss}` — timestamps at both ends.
- **On transient**, the current-playhead column renders at max height (`⣿`) for one frame regardless of envelope.

### 5.7 Bottom LED strip — part of `widgets/controls.ts` keysR row

- Left half: existing legend `[p]lay [n]xt [b]ck [m]ute [v]is [a]rt [/]srch [1-8]pad [q]uit`
- Right half: 21-dot LED strip `● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ● ●`
- **Chaser**: one LED at a time is lit in `theme.accent`; advances one position per `transientPeak` event, wraps around. All other LEDs render as `·` in `theme.dim`.
- On pause: chaser freezes at current position; all 21 dots render dim.

### 5.8 Top bar — `widgets/titleBar.ts` (updated)

Two rows (was 1):
- Row 0: `╭─[ TUI·AMP ◦ NNN ]──[ / search ]──[ cpu·NN.N · rms·N.NN · lufs·-N · 48k ]─╮`
- Row 1: status-LED strip left + dotted fill center + catalog readout right
  - Left: `◦in● ◦out● ◦sync○ ◦midi● ◦mon● ◦lim○` — each `◦` followed by `●` (lit) or `○` (off). States:
    - `◦in` / `◦out` → lit when audio source connected
    - `◦sync` → strobes on `transientPeak` (100ms accent pulse, then off)
    - `◦midi` / `◦mon` → static chrome for now
    - `◦lim` → lit when `rms > 0.7`
  - Center: `····························` static texture
  - Right: `◦ pgm 01 ◦ bnk a ◦ bpm NNN ◦ XX` — catalog chrome

## 6. Reactivity system

### 6.1 Data inputs (existing, no new feeders)

All animations subscribe to fields on `AppState` that are already maintained by existing feeders:

| Field | Source | Used for |
|---|---|---|
| `spectrum[16]` | audioFeeder | Spectrum bars + peak-hold |
| `meterL`, `meterR` | audioFeeder | VU meters + numeric % |
| `rms` | audioFeeder | Lim LED, overall-energy gauges, brightness pulse (if later enabled) |
| `transientPeak` | audioFeeder onset detector | Sync LED strobe, lyric brightness flash, scanline pulse, bass-bin accent, LED chaser advance, active-pad fingerprint bump, waveform playhead spike |
| `transientEnergy` | audioFeeder onset detector | Threshold gate for bass-bin accent (>0.6) |
| `progressMs`, `durationMs` | spotifyFeeder | Progress waveform, active-lyric index |
| `activeLyricIndex` | lyricsFeeder | Which lyric to render big |
| `isPlaying` | spotifyFeeder | Pause-state dims, transport-glyph swap, chaser freeze |

### 6.2 Accent-monopoly arbiter

New module: `src/player/accentArbiter.ts`.

```ts
export type AccentTarget =
  | "lyric"       // default — active lyric line owns accent
  | "sync"        // 100ms after transient
  | "bass-bin"    // 100ms after transient with energy > 0.6
  | "peak"        // 200ms after meter peak > 0.92
  | "clip"        // 200ms after sample clip
  | "lim";        // steady while rms > 0.7 (no-one else present)

export function resolveAccentTargets(state: AppState, now: number): Set<AccentTarget>;
```

Multiple targets can hold accent simultaneously **only when they're on different panels** (e.g. lyric + sync LED + bass bin can all be accented at once — the rule is one-accent-per-*panel*, not one-accent-per-frame). The arbiter returns a `Set<AccentTarget>`; each widget checks membership.

The arbiter is a pure function of `state` + `now` (wallclock ms). It reads timestamps of last transient / last clip / last peak stored on state (new fields: `lastTransientAt`, `lastClipAt`, `lastPeakAt` — populated by the audioFeeder).

### 6.3 Peak-hold pattern (shared)

Reused by VU meters and spectrum bars. New utility: `src/player/peakHold.ts`.

```ts
export interface PeakHoldBuffer {
  values: Float32Array;
  heldUntilMs: Float64Array;
}

export function updatePeakHold(buf: PeakHoldBuffer, current: Float32Array, now: number, holdMs: number): void;
```

- If `current[i] >= buf.values[i]`: set `values[i] = current[i]`, `heldUntilMs[i] = now + holdMs`
- If `now > heldUntilMs[i]`: decay `values[i]` at 2 cells/100ms (= `0.02 * dtMs`)
- Render reads `buf.values[i]` and draws the hold dot at that level

### 6.4 Brightness variants

Bitfont accent flash uses a **brighter palette variant**. `theme.ts` gains a `theme.accentBright` field (256-color index = current accent index's brighter neighbour, e.g. 208 → 214 → 220 for warm palette). Widgets pass `bright: boolean` to their render fn and pick accordingly.

## 7. Data model changes

`AppState` additions ([src/player/state.ts](../../../src/player/state.ts)):

```ts
lastTransientAt: number;       // Date.now() of last onset
lastClipAt: number;            // Date.now() of last sample clip
lastPeakAt: number;            // Date.now() of last meter peak > 0.92
progressEnvelope: Float32Array;// 128 slots — filled by audioFeeder on track progress
ledChaserIndex: number;        // 0-20, advances per transient
activePadIndex: number;        // 0-7, which queue pad maps to currentTrack
padFingerprints: Uint8Array[]; // 4×4 binary fingerprints, one per queue slot
```

`AsciiArt` additions ([src/album/converter.ts](../../../src/album/converter.ts)):

```ts
padFingerprint: Uint8Array;    // 16 bytes — 4×4 bit grid, computed from downsampled art
```

## 8. Testing strategy (TDD order)

Tests are written first for each unit, driving the implementation. All tests use `node:test` + `assert` (existing pattern) and the `Renderer.debugLines()` / cell-level assertions already in use.

1. **`layout.test.ts`** — new region geometry:
   - `topRow.height === 15`, `nowR.width === 34`, `padsR.width === 34`
   - `screenR.width + nowR.width + padsR.width === inner.width`
   - `middleRow.height >= 8`
   - Junction arrays produce no `┼` crosses
   - `MIN_COLS === 108`, `MIN_ROWS === 28`

2. **`accentArbiter.test.ts`** — pure function tests:
   - default returns `{"lyric"}`
   - `transientPeak` within 100ms → includes `"sync"`
   - `transientEnergy > 0.6` within 100ms → includes `"bass-bin"`
   - Clip → includes `"clip"` for 200ms
   - Peak > 0.92 → includes `"peak"` for 200ms
   - All can coexist (accents scoped to different panels)

3. **`peakHold.test.ts`**:
   - new max → value updated, `heldUntilMs` set
   - within hold window → value unchanged
   - after hold window → decay at configured rate
   - decay stops at 0

4. **`bigLyric.test.ts`**:
   - `renderBigLine("HI")` returns 8 rows
   - half-block compression returns 4 rows, each composed of `▀▄█ `
   - widget writes 4 rows starting at `region.y + 2`
   - scroll: offset increments at constant rate
   - transient → uses `theme.accentBright`, else `theme.accent`

5. **`trackDna.test.ts`**:
   - `computeDna(id)` returns same object every call (determinism)
   - Different IDs produce different `bpm` with high probability (sample 100 IDs, assert ≥ 90 unique bpms)
   - All outputs within declared ranges (bpm 72-168, energy/valence/dance/aco 0-100, lufs -19 to -4)
   - `keyIndex` ∈ [0,11], `keyMode` ∈ {"maj","min"}

6. **`queuePads.test.ts`**:
   - 8 pads rendered in 2×4 grid with correct positions
   - active pad header uses accent color
   - fingerprint bytes render as `●` for 1-bits and `·` for 0-bits
   - footer reflects active pad's name + bpm
   - empty slot renders `┌NN──┐` + `····` placeholder

7. **`spectrum.test.ts`** (update existing):
   - peak-hold `●` row present
   - bass-bin column gets accent when `bass-bin` is in accent set
   - frequency labels present on header row

8. **`progressWave.test.ts`** (new, from `controls.ts`):
   - envelope ring buffer → correct Braille glyph per slot
   - playhead column in accent
   - transient → playhead at max (`⣿`)

9. **`titleBar.test.ts`** (update existing):
   - two rows rendered
   - status-LED strip has 6 LEDs
   - sync LED toggles on `transientPeak` recency

10. **Integration**: `App.test.ts` (new) — builds `App`, steps one frame with a canned state, snapshots all visible lines, verifies no `┼` chars, no overlap between regions.

## 9. Migration & cleanup

- **Delete**: `src/player/widgets/recentlyPlayed.ts` + test file. `pushRecentlyPlayed` stays (feeds the queue pads now).
- **Rename**: `widgets/albumArt.ts` → keep name; internal logic changes but widget-level API (`renderAlbumArt(r, region, state, theme)`) stays identical so `App.ts` wiring is unchanged
- **New modules**: `widgets/queuePads.ts`, `widgets/bigLyric.ts`, `accentArbiter.ts`, `peakHold.ts`, `trackDna.ts`
- **Updated**: `widgets/nowPlaying.ts`, `widgets/lyrics.ts`, `widgets/spectrum.ts`, `widgets/controls.ts`, `widgets/titleBar.ts`, `layout.ts`, `state.ts`, `theme.ts`, `album/converter.ts`
- **App wiring** ([App.ts:118](../../../src/player/App.ts:118)): swap `renderRecentlyPlayed` call → `renderQueuePads`, pass `accentArbiter.resolveAccentTargets` result to each widget that needs it
- **Keybinds** ([App.ts:149](../../../src/player/App.ts:149)): add cases `"play_pad_N"` for N=1..8 → `spotifyDesktop.playTrack(state.queuePads[N-1].uri)`. Register in [input.ts](../../../src/ui/input.ts).

## 10. Scope boundaries

**In scope:**
- Layout rewrite, new widgets, reactivity arbiter, bitfont big-type for active lyric, dot-matrix chrome everywhere, pad-grid queue as Recently-Played replacement
- Sub-bass accent flash, sync LED strobe, peak-hold across meters + spectrum, Braille-waveform progress
- Fingerprint generation from album art
- Accent-monopoly arbiter

**Out of scope (future):**
- Spotify queue API integration (pads use `recentlyPlayed` as proxy for now)
- Spotify audio-features API for track DNA — this cycle ships with deterministic-from-trackId fudged values (see §5.2). When the API is wired later, swap the data source at the single `computeDna(...)` call site; rendering is unchanged.
- BPM detection from audio (bpm value shown is either from Spotify if available, else `---`)
- Wiring `◦ mix`, `◦ eq`, `[⟲]`, `[◉ rec]` to actual functionality — these are chrome for now
- Enabling `◦ tilt` / `◦ a-weight` spectrum toggles
- Animating `····` dot fillers (decided against — undermines accent hierarchy)
- Palette variants beyond existing four (amber/teal/magenta/mono stay)

## 11. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Bitfont at 8 rows is tall; lyrics panel needs ≥7 rows, can break on small terminals | MIN_ROWS raised to 28; below minimum, app falls back to the existing "too small" banner (already implemented in [App.ts:101](../../../src/player/App.ts:101)) |
| Half-block compression artifacts (aliasing) on some fonts | Use `▀▄█ ` exclusively — renders correctly in all monospace fonts; test across the project's four-palette mono mode |
| Per-frame `resolveAccentTargets` call + Set allocation at 60fps | Inline the function, reuse a pre-allocated Set, clear-and-populate each frame. Profile if flame-graph flags it. |
| `progressEnvelope` ring buffer grows with track length — actually fixed-size 128 slots | Slot duration = durationMs/128, recomputed per track. No growth. |
| Pad fingerprint generation adds latency to album-art fetch | Generation is O(16×16) downsample + threshold — <1ms, no async needed. Folds into existing `convertToAscii` pipeline. |
| Spotify API rate-limit if we ever wire audio-features | Out of scope this cycle. When wired, cache per-track-ID indefinitely. |
| Scale-contrast rule says only lyric is big-type, but user may want title big too | Resolved in §5.2: title stays regular-size, owns hero fg color + `▸` marker. Reassess after implementation if attention-testing shows title gets lost. |

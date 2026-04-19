/**
 * VisualizerEngine — Ratatui-pattern architecture.
 *
 * Responsibilities:
 *   - Coordinate background services: AudioSource, CavaStream, LyricsService
 *   - Maintain a single VisState (mutated only by service handlers + render tick)
 *   - Run the render loop: compute constraint layout → dispatch pure widget functions
 *   - Handle keyboard input
 *
 * Layout (computed each frame via tui.ts):
 *
 *   ┌── search bar (1 row, full width) ────────────────────────┐
 *   ├─────────────────────┬────────────────────────────────────┤
 *   │  Record Deck (50 %) │  Lyrics Terminal (50 % × 50 %)     │
 *   │  ─ now playing      ├────────────────────────────────────┤
 *   │  ─ platter          │  Wave Panel     (50 % × 50 %)      │
 *   │  ─ progress│grille  │                                    │
 *   │  ─ album art        │                                    │
 *   └─────────────────────┴────────────────────────────────────┘
 */

import type { AudioSource } from "../audio/AudioSource.js";
import { computeMagnitudeSpectrum } from "../dsp/fft.js";
import { computeBuckets } from "../dsp/buckets.js";
import { smoothBuckets, smoothValue, DEFAULT_BAR_SMOOTHING, DEFAULT_ENERGY_SMOOTHING } from "../dsp/smoothing.js";
import { extractFeatures } from "../dsp/features.js";
import { createInitialState } from "./state.js";
import type { VisState, VisMode } from "./state.js";
import { Renderer } from "../ui/renderer.js";
import { buildTheme } from "../ui/theme.js";
import { isTooSmall, tooSmallMessage } from "../ui/layout.js";
import { enterAlternateScreen, exitAlternateScreen, getTerminalSize } from "../ui/AppScreen.js";
import { startInput, stopInput } from "../ui/input.js";
import type { Action } from "../ui/input.js";
import { vSplit, hSplit, C } from "../ui/tui.js";
import * as spotifyDesktop from "../macos/spotifyDesktop.js";
import { onCleanup } from "../utils/cleanup.js";
import { fetchImageBuffer } from "../album/fetcher.js";
import { convertToAscii } from "../album/converter.js";
import { getCached, setCached } from "../album/cache.js";
import { CavaStream } from "../audio/cava.js";
import { fetchLyrics, activeLyricIndex } from "../lyrics/lrclib.js";
import { SongFeatureTracker } from "../dsp/songFeatures.js";
import { buildSongTheme, defaultSongTheme } from "./songTheme.js";
import { computeLayout } from "../ui/layout.js";

// Widgets
import { renderSearchBar }       from "./widgets/searchBar.js";
import { renderRecordDeck }      from "./widgets/recordDeck.js";
import { renderLyricsTerminal }  from "./widgets/lyricsTerminal.js";
import { renderWavePanel }       from "./widgets/wavePanel.js";

export interface EngineOptions {
  mode: VisMode;
  numBars: number;
  fps: number;
  sampleRate: number;
  asciiSafe: boolean;
  noColor: boolean;
}

export class VisualizerEngine {
  private audio: AudioSource;
  private opts: EngineOptions;
  private state: VisState;
  private renderer!: Renderer;
  private theme = buildTheme(false, true);
  private peak = { value: 1e-6 };
  private running = false;
  private renderTimer: ReturnType<typeof setInterval> | null = null;
  private spotifyTimer: ReturnType<typeof setInterval> | null = null;
  private cava: CavaStream | null = null;
  private songTracker = new SongFeatureTracker();
  private themeRefreshCounter = 0;

  constructor(audio: AudioSource, opts: EngineOptions) {
    this.audio = audio;
    this.opts  = opts;
    const { cols, rows } = getTerminalSize();
    this.state = createInitialState(opts.mode, opts.numBars, cols, rows);
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

  async start(): Promise<void> {
    this.running = true;
    this.theme   = buildTheme(this.opts.asciiSafe, !this.opts.noColor);

    enterAlternateScreen();
    onCleanup(() => this.stop());

    const { cols, rows } = getTerminalSize();
    this.renderer    = new Renderer(cols, rows);
    this.state.cols  = cols;
    this.state.rows  = rows;

    process.stdout.on("resize", () => {
      const { cols: c, rows: r } = getTerminalSize();
      this.renderer.resize(c, r);
      this.state.cols         = c;
      this.state.rows         = r;
      this.state.scrollHistory = new Float32Array(c);
      // Force art reconversion on next poll
      if (this.state.albumArt && this.state.albumArt.cols !== c) {
        this.state.albumArtUrl = "";
        this.state.albumArt    = null;
      }
    });

    // Audio → DSP
    this.audio.onFrame((frame) => {
      if (!this.running) return;
      this.processAudioFrame(frame);
    });
    await this.audio.start();

    // Cava (optional — falls back to smoothedBuckets on error)
    this.startCava();

    // Spotify metadata poll (1 Hz)
    void this.pollSpotify();
    this.spotifyTimer = setInterval(() => void this.pollSpotify(), 1_000);

    // Render loop
    const frameMs = Math.round(1000 / this.opts.fps);
    this.renderTimer = setInterval(() => this.renderFrame(), frameMs);

    startInput((action) => void this.handleAction(action));
  }

  async stop(): Promise<void> {
    if (!this.running) return;
    this.running = false;
    if (this.renderTimer)  clearInterval(this.renderTimer);
    if (this.spotifyTimer) clearInterval(this.spotifyTimer);
    this.renderTimer  = null;
    this.spotifyTimer = null;
    this.cava?.stop();
    this.cava = null;
    stopInput();
    await this.audio.stop();
    exitAlternateScreen();
  }

  // ── cava ──────────────────────────────────────────────────────────────────

  private startCava(): void {
    const numBars = Math.max(8, Math.min(32, this.opts.numBars));
    this.cava = new CavaStream(numBars, this.opts.fps);

    this.cava.on("frame", (bars: Float32Array) => {
      if (!this.running) return;
      this.state.cavaBars  = bars;
      this.state.cavaActive = true;
    });

    this.cava.on("unavailable", (_reason: string) => {
      // cava not installed — wave panel will use smoothedBuckets
      this.cava = null;
    });

    this.cava.start();
  }

  // ── DSP ───────────────────────────────────────────────────────────────────

  private processAudioFrame(frame: Float32Array): void {
    const mags = computeMagnitudeSpectrum(frame);
    const raw  = computeBuckets(mags, this.opts.numBars, this.opts.sampleRate, this.peak);

    if (this.state.rawBuckets.length !== raw.length) {
      this.state.rawBuckets     = new Float32Array(raw.length);
      this.state.smoothedBuckets = new Float32Array(raw.length);
    }
    this.state.rawBuckets.set(raw);
    smoothBuckets(this.state.smoothedBuckets, raw, DEFAULT_BAR_SMOOTHING);

    const features = extractFeatures(mags, this.opts.sampleRate);
    this.state.low       = smoothValue(this.state.low,       features.low,  DEFAULT_ENERGY_SMOOTHING);
    this.state.mid       = smoothValue(this.state.mid,       features.mid,  DEFAULT_ENERGY_SMOOTHING);
    this.state.high      = smoothValue(this.state.high,      features.high, DEFAULT_ENERGY_SMOOTHING);
    this.state.amplitude = smoothValue(this.state.amplitude, features.rms,  DEFAULT_ENERGY_SMOOTHING);
    this.state.pulse     = features.pulse;

    const now = Date.now();
    if (features.pulse > 0.35) {
      this.state.lastPulseMs       = now;
      this.state.lastPulseStrength = Math.min(1, features.pulse);
      this.state.ringQueue.push({ ms: now, strength: features.pulse });
      if (this.state.ringQueue.length > 4) this.state.ringQueue.shift();
    }
    this.state.ringQueue = this.state.ringQueue.filter((r) => now - r.ms < 1200);

    this.songTracker.update(
      this.state.low, this.state.mid, this.state.high,
      this.state.amplitude, features.pulse, now
    );
    this.state.songFeatures = this.songTracker.features;
  }

  // ── Spotify polling ───────────────────────────────────────────────────────

  private async pollSpotify(): Promise<void> {
    try {
      const st = await spotifyDesktop.getState();
      if (!st) {
        this.state.trackName   = "";
        this.state.artistName  = "";
        this.state.albumName   = "";
        this.state.deviceName  = "";
        this.state.isPlaying   = false;
        this.state.progressMs  = 0;
        this.state.durationMs  = 0;
        this.state.albumArtUrl = "";
        this.state.albumArt    = null;
        return;
      }

      this.state.trackName  = st.trackName;
      this.state.artistName = st.artistName;
      this.state.albumName  = st.albumName;
      this.state.deviceName = st.deviceName;
      this.state.isPlaying  = st.isPlaying;
      this.state.progressMs = st.progressMs;
      this.state.durationMs = st.durationMs;

      // Track-change detection
      const trackKey = `${st.trackName}:::${st.artistName}`;
      if (trackKey !== this.state.currentTrackId) {
        this.state.currentTrackId = trackKey;
        this.songTracker.reset();
        this.state.particles  = [];
        this.state.ringQueue  = [];
        this.rebuildSongTheme();

        // Kick off lyrics fetch for the new track
        void this.fetchLyricsForTrack(st.trackName, st.artistName, st.albumName, trackKey);
      }

      // Album art
      const imageUrl = st.albumArtUrl;
      if (imageUrl && imageUrl !== this.state.albumArtUrl) {
        this.state.albumArtUrl = imageUrl;
        const cached = getCached(trackKey);
        if (cached && cached.cols === this.state.cols) {
          this.state.albumArt = cached;
        } else {
          const cols    = this.state.cols;
          const noColor = this.opts.noColor;
          const layout  = computeLayout(cols, this.state.rows);
          const vizH    = layout.visualizer.height;
          fetchImageBuffer(imageUrl)
            .then((buf) => convertToAscii(buf, trackKey, cols, vizH, noColor))
            .then((art) => {
              setCached(trackKey, art);
              if (this.state.albumArtUrl === imageUrl) {
                this.state.albumArt = art;
              }
            })
            .catch(() => { /* network/decode failure — no art */ });
        }
      }
    } catch {
      // Desktop query failed — don't crash
    }
  }

  // ── Lyrics ────────────────────────────────────────────────────────────────

  private async fetchLyricsForTrack(
    track: string, artist: string, album: string, key: string
  ): Promise<void> {
    this.state.lrcLines         = [];
    this.state.activeLyricIdx   = 0;
    this.state.lyricRevealedChars = 0;
    this.state.lyricRevealStartMs = 0;
    this.state.lyricFetchKey    = key;
    this.state.lyricFetchState  = "fetching";

    const lines = await fetchLyrics(track, artist, album);

    // Guard: track might have changed while we awaited
    if (this.state.lyricFetchKey !== key) return;

    if (lines.length > 0) {
      this.state.lrcLines        = lines;
      this.state.lyricFetchState = "ready";
    } else {
      this.state.lyricFetchState = "none";
    }
  }

  // ── Song theme ────────────────────────────────────────────────────────────

  private rebuildSongTheme(): void {
    const base = { dim: this.theme.dim, normal: this.theme.normal, bright: this.theme.bright, reset: this.theme.reset };
    this.state.songTheme = this.state.currentTrackId
      ? buildSongTheme(this.state.currentTrackId, this.state.songFeatures, base, this.theme.colorEnabled)
      : defaultSongTheme(base, this.theme.colorEnabled);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  private renderFrame(): void {
    if (!this.running) return;

    const now = Date.now();

    // Periodic theme refresh (every ~3 s) as song features settle
    if (++this.themeRefreshCounter >= Math.round(this.opts.fps * 3)) {
      this.themeRefreshCounter = 0;
      this.rebuildSongTheme();
    }

    // Advance lyrics sync
    this.syncLyrics(now);

    const { cols, rows } = { cols: this.state.cols, rows: this.state.rows };
    this.renderer.clear();

    if (isTooSmall(cols, rows)) {
      this.renderer.writeCenter(Math.floor(rows / 2), tooSmallMessage(cols, rows));
      this.renderer.flush();
      return;
    }

    // ── Constraint layout ──
    //   Frame → [searchR (1), bodyR (fill)]
    //   bodyR → [leftR (50 %), rightR (50 %)]
    //   rightR → [lyricsR (50 %), waveR (50 %)]

    const frame = { x: 0, y: 0, width: cols, height: rows };
    const [searchR, bodyR] = vSplit(frame, [C.length(1), C.fill()]);
    const [leftR, rightR]  = hSplit(bodyR,  [C.percent(50), C.percent(50)]);
    const [lyricsR, waveR] = vSplit(rightR, [C.percent(50), C.percent(50)]);

    // ── Widget dispatch ──
    renderSearchBar(this.state, this.renderer, searchR);
    renderRecordDeck(this.state, this.renderer, leftR, now);
    renderLyricsTerminal(this.state, this.renderer, lyricsR, now);
    renderWavePanel(this.state, this.renderer, waveR, now);

    this.renderer.flush();
  }

  // ── Lyrics sync ───────────────────────────────────────────────────────────

  private syncLyrics(now: number): void {
    const lines = this.state.lrcLines;
    if (lines.length === 0) return;

    const newIdx = activeLyricIndex(lines, this.state.progressMs);
    if (newIdx !== this.state.activeLyricIdx) {
      this.state.activeLyricIdx     = newIdx;
      this.state.lyricRevealedChars  = 0;
      this.state.lyricRevealStartMs  = now;
    }
  }

  // ── Input ─────────────────────────────────────────────────────────────────

  private async handleAction(action: Action): Promise<void> {
    try {
      switch (action) {
        case "quit":
          await this.stop();
          process.exit(0);
          break;
        case "toggle_play":
          if (this.state.isPlaying) await spotifyDesktop.pause();
          else await spotifyDesktop.play();
          await this.pollSpotify();
          break;
        case "next":
          await spotifyDesktop.nextTrack();
          await this.pollSpotify();
          break;
        case "prev":
          await spotifyDesktop.previousTrack();
          await this.pollSpotify();
          break;
        case "switch_mode":
          // Mode switching no longer cycles visualizer modes — this UI
          // has a fixed layout.  Re-use the key to toggle album-art overlay.
          if (this.state.mode !== "album-art") {
            if (this.state.albumArt) {
              this.state.priorMode = this.state.mode;
              this.state.mode      = "album-art";
            }
          } else {
            this.state.mode = this.state.priorMode;
          }
          break;
        case "toggle_album_art":
          if (this.state.mode !== "album-art") {
            if (this.state.albumArt) {
              this.state.priorMode = this.state.mode;
              this.state.mode      = "album-art";
            }
          } else {
            this.state.mode = this.state.priorMode;
          }
          break;
        case "refresh":
          await this.pollSpotify();
          break;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.renderer.writeCenter(
        this.state.rows - 2,
        `  ERR: ${msg.slice(0, Math.max(1, this.state.cols - 8))}  `
      );
    }
  }
}

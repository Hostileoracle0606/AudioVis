/**
 * Visualizer engine.
 *
 * Coordinates:
 *   - Audio frame intake → DSP pipeline
 *   - Spotify metadata polling (1 Hz)
 *   - Render loop (target 30 FPS)
 *   - Keyboard input actions
 */

import type { AudioSource } from "../audio/AudioSource.js";
import { computeMagnitudeSpectrum } from "../dsp/fft.js";
import { computeBuckets } from "../dsp/buckets.js";
import { smoothBuckets, smoothValue, DEFAULT_BAR_SMOOTHING, DEFAULT_ENERGY_SMOOTHING } from "../dsp/smoothing.js";
import { extractFeatures } from "../dsp/features.js";
import { createInitialState } from "./state.js";
import type { VisState, VisMode } from "./state.js";
import { renderWavefield } from "./modes/wavefield.js";
import { renderScroll, pushScrollHistory } from "./modes/scroll.js";
import { renderSpectrum } from "./modes/spectrum.js";
import { Renderer } from "../ui/renderer.js";
import { buildTheme } from "../ui/theme.js";
import { computeLayout, isTooSmall, tooSmallMessage } from "../ui/layout.js";
import { renderProgressBar } from "../ui/progressBar.js";
import { formatSeconds, padRight, padLeft, truncateMiddle } from "../ui/format.js";
import { enterAlternateScreen, exitAlternateScreen, getTerminalSize } from "../ui/AppScreen.js";
import { startInput, stopInput } from "../ui/input.js";
import type { Action } from "../ui/input.js";
import * as spotify from "../spotify/client.js";
import {
  buildAnalysisFrame,
  inferStyleProfile,
  smoothStyleProfile,
} from "../spotify/styleProfile.js";
import { onCleanup } from "../utils/cleanup.js";
import { fetchImageBuffer } from "../album/fetcher.js";
import { convertToAscii } from "../album/converter.js";
import { getCached, setCached } from "../album/cache.js";
import { renderAlbumArt } from "./modes/albumArt.js";

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
  private lastFrameMs = 0;

  constructor(audio: AudioSource, opts: EngineOptions) {
    this.audio = audio;
    this.opts = opts;

    const { cols, rows } = getTerminalSize();
    this.state = createInitialState(opts.mode, opts.numBars, cols, rows);
  }

  async start(): Promise<void> {
    this.running = true;
    this.theme = buildTheme(
      this.opts.asciiSafe,
      !this.opts.noColor,
      this.state.styleProfile
    );

    // Set up terminal
    enterAlternateScreen();
    onCleanup(() => this.stop());

    const { cols, rows } = getTerminalSize();
    this.renderer = new Renderer(cols, rows);
    this.state.cols = cols;
    this.state.rows = rows;

    // Handle terminal resize
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

    // Wire audio frames into DSP pipeline
    this.audio.onFrame((frame) => {
      if (!this.running) return;
      this.processAudioFrame(frame);
    });

    // Start audio capture
    await this.audio.start();

    // Kick off Spotify poll immediately
    void this.pollSpotify();
    this.spotifyTimer = setInterval(() => void this.pollSpotify(), 1000);

    // Render loop
    const frameMs = Math.round(1000 / this.opts.fps);
    this.renderTimer = setInterval(() => this.renderFrame(), frameMs);

    // Keyboard input
    startInput((action) => void this.handleAction(action));
  }

  async stop(): Promise<void> {
    if (!this.running) return;
    this.running = false;

    if (this.renderTimer) clearInterval(this.renderTimer);
    if (this.spotifyTimer) clearInterval(this.spotifyTimer);
    this.renderTimer = null;
    this.spotifyTimer = null;

    stopInput();
    await this.audio.stop();
    exitAlternateScreen();
  }

  // ---------------------------------------------------------------------------
  // DSP
  // ---------------------------------------------------------------------------

  private processAudioFrame(frame: Float32Array): void {
    const mags = computeMagnitudeSpectrum(frame);

    // Compute raw buckets and smooth them
    const raw = computeBuckets(mags, this.opts.numBars, this.opts.sampleRate, this.peak);

    if (this.state.rawBuckets.length !== raw.length) {
      this.state.rawBuckets = new Float32Array(raw.length);
      this.state.smoothedBuckets = new Float32Array(raw.length);
    }
    this.state.rawBuckets.set(raw);
    smoothBuckets(this.state.smoothedBuckets, raw, DEFAULT_BAR_SMOOTHING);

    // Energy features
    const features = extractFeatures(mags, this.opts.sampleRate);
    this.state.low = smoothValue(this.state.low, features.low, DEFAULT_ENERGY_SMOOTHING);
    this.state.mid = smoothValue(this.state.mid, features.mid, DEFAULT_ENERGY_SMOOTHING);
    this.state.high = smoothValue(this.state.high, features.high, DEFAULT_ENERGY_SMOOTHING);
    this.state.amplitude = smoothValue(this.state.amplitude, features.rms, DEFAULT_ENERGY_SMOOTHING);
    this.state.pulse = features.pulse; // don't smooth pulse — it should be sharp
    this.state.styleProfile = smoothStyleProfile(
      this.state.styleProfile,
      {
        ...this.state.styleProfile,
        glitch: Math.min(
          1,
          this.state.styleProfile.glitch * 0.92 +
            features.high * 0.03 +
            features.pulse * 0.09
        ),
        aggression: Math.min(
          1,
          this.state.styleProfile.aggression * 0.94 +
            features.low * 0.03 +
            features.pulse * 0.06
        ),
        density: Math.min(
          1,
          this.state.styleProfile.density * 0.95 + features.rms * 0.04
        ),
        groove: Math.min(
          1,
          this.state.styleProfile.groove * 0.96 +
            features.low * 0.02 +
            features.mid * 0.01
        ),
      },
      0.08
    );
  }

  // ---------------------------------------------------------------------------
  // Spotify polling
  // ---------------------------------------------------------------------------

  private async pollSpotify(): Promise<void> {
    try {
      const playback = await spotify.getCurrentPlayback();
      if (!playback || !playback.item) {
        this.state.trackName   = "";
        this.state.trackId     = "";
        this.state.artistName  = "";
        this.state.albumName   = "";
        this.state.deviceName  = playback?.device?.name ?? "";
        this.state.isPlaying   = false;
        this.state.progressMs  = 0;
        this.state.durationMs  = 0;
        this.state.spotifyStatus = "No active Spotify playback";
        this.state.analysis = null;
        this.state.albumArtUrl = "";
        this.state.albumArt    = null;
        return;
      }

      const previousTrackId = this.state.trackId;
      this.state.trackId    = playback.item.id;
      this.state.trackName  = playback.item.name;
      this.state.artistName = playback.item.artists.map((a) => a.name).join(", ");
      this.state.albumName  = playback.item.album.name;
      this.state.deviceName = playback.device?.name ?? "";
      this.state.isPlaying  = playback.is_playing;
      this.state.progressMs = playback.progress_ms ?? 0;
      this.state.durationMs = playback.item.duration_ms;
      this.state.spotifyStatus = "";

      if (playback.item.id !== previousTrackId) {
        const artistIds = playback.item.artists.map((artist) => artist.id).filter(Boolean);
        const [artists, features, analysis] = await Promise.all([
          spotify.getArtists(artistIds),
          spotify.getAudioFeatures(playback.item.id),
          spotify.getAudioAnalysis(playback.item.id),
        ]);

        this.state.analysis = analysis;
        this.state.currentSegmentIndex = 0;
        this.state.currentBeatIndex = 0;
        this.state.currentTatumIndex = 0;
        this.state.currentSectionIndex = 0;
        this.state.styleProfile = inferStyleProfile({
          artists,
          features,
          analysis,
        });
      }

      this.syncAnalysisFrame();

      // Album art: use the smallest image (last in array, Spotify orders largest→smallest)
      const images = playback.item.album.images;
      const imageUrl = images.length > 0 ? images[images.length - 1].url : "";

      if (imageUrl && imageUrl !== this.state.albumArtUrl) {
        this.state.albumArtUrl = imageUrl;

        const cached = getCached(playback.item.id);
        if (cached && cached.cols === this.state.cols) {
          this.state.albumArt = cached;
        } else {
          const trackId = playback.item.id;
          const cols    = this.state.cols;
          const noColor = this.opts.noColor;
          const layout  = computeLayout(cols, this.state.rows);
          const vizH    = layout.visualizer.height;

          fetchImageBuffer(imageUrl)
            .then((buf) => convertToAscii(buf, trackId, cols, vizH, noColor))
            .then((art) => {
              setCached(trackId, art);
              if (this.state.albumArtUrl === imageUrl) {
                this.state.albumArt = art;
              }
            })
            .catch(() => {
              // Network/decode failure — no art, no crash
            });
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Spotify metadata unavailable";
      this.state.trackName = "";
      this.state.artistName = "";
      this.state.albumName = "";
      this.state.deviceName = "";
      this.state.isPlaying = false;
      this.state.progressMs = 0;
      this.state.durationMs = 0;
      this.state.trackId = "";
      this.state.analysis = null;
      this.state.albumArtUrl = "";
      this.state.albumArt = null;
      this.state.spotifyStatus = msg;
    }
  }

  private syncAnalysisFrame(): void {
    const { analysis, progressMs } = this.state;
    if (!analysis) {
      return;
    }

    const playbackSeconds = progressMs / 1000;
    const advanceIndex = <T extends { start: number }>(
      collection: T[],
      currentIndex: number
    ): number => {
      if (collection.length === 0) return 0;
      let index = Math.max(0, Math.min(currentIndex, collection.length - 1));
      while (index + 1 < collection.length && playbackSeconds >= collection[index + 1].start) {
        index += 1;
      }
      while (index > 0 && playbackSeconds < collection[index].start) {
        index -= 1;
      }
      return index;
    };

    this.state.currentSegmentIndex = advanceIndex(
      analysis.segments,
      this.state.currentSegmentIndex
    );
    this.state.currentBeatIndex = advanceIndex(
      analysis.beats,
      this.state.currentBeatIndex
    );
    this.state.currentTatumIndex = advanceIndex(
      analysis.tatums,
      this.state.currentTatumIndex
    );
    this.state.currentSectionIndex = advanceIndex(
      analysis.sections,
      this.state.currentSectionIndex
    );

    this.state.analysisFrame = buildAnalysisFrame({
      analysis,
      progressMs,
      currentSegmentIndex: this.state.currentSegmentIndex,
      currentBeatIndex: this.state.currentBeatIndex,
      currentTatumIndex: this.state.currentTatumIndex,
      currentSectionIndex: this.state.currentSectionIndex,
    });
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  private renderFrame(): void {
    if (!this.running) return;
    this.syncAnalysisFrame();
    this.theme = buildTheme(
      this.opts.asciiSafe,
      !this.opts.noColor,
      this.state.styleProfile
    );

    const { cols, rows } = { cols: this.state.cols, rows: this.state.rows };

    this.renderer.clear();

    if (isTooSmall(cols, rows)) {
      this.renderer.writeCenter(Math.floor(rows / 2), tooSmallMessage(cols, rows));
      this.renderer.flush();
      return;
    }

    const layout = computeLayout(cols, rows);
    const s = this.state;

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
      const stateLine =
        `  State: ${stateStr}   Style: ${truncateMiddle(s.styleProfile.label, 24)}   Pitch: ${s.styleProfile.dominantPitchLabel}`;
      this.renderer.write(5, 1, padRight(stateLine, cols - timePart.length - 6));
      this.renderer.write(cols - timePart.length, 1, timePart);
    } else {
      const title = truncateMiddle(
        s.spotifyStatus || "No active Spotify playback",
        Math.max(1, cols - 18)
      );
      this.renderer.write(0, 0, `  Spotify: ${title}`);
      this.renderer.write(0, 1, "  State: Idle");
    }

    // --- Progress bar ---
    const progress =
      s.durationMs > 0 ? s.progressMs / s.durationMs : 0;
    const barWidth = Math.min(60, cols - 4);
    const bar = renderProgressBar(progress, barWidth);
    this.renderer.writeCenter(layout.progress.y, bar);

    // --- Visualizer ---
    pushScrollHistory(s, layout.visualizer.width);
    if (s.mode === "wavefield") {
      renderWavefield(s, this.renderer, layout.visualizer, this.theme);
    } else if (s.mode === "scroll") {
      renderScroll(s, this.renderer, layout.visualizer, this.theme);
    } else if (s.mode === "album-art") {
      renderAlbumArt(s, this.renderer, layout.visualizer, this.theme);
    } else {
      renderSpectrum(s, this.renderer, layout.visualizer, this.theme);
    }

    // --- Footer ---
    const footer =
      "[space] play/pause   [n] next   [p] prev   [s] mode   [a] art   [q] quit";
    this.renderer.writeCenter(layout.footer.y, footer);

    this.renderer.flush();
  }

  // ---------------------------------------------------------------------------
  // Input handling
  // ---------------------------------------------------------------------------

  private async handleAction(action: Action): Promise<void> {
    try {
      switch (action) {
        case "quit":
          await this.stop();
          process.exit(0);
          break;
        case "toggle_play":
          if (this.state.isPlaying) await spotify.pause();
          else await spotify.play();
          // Immediately refresh metadata
          await this.pollSpotify();
          break;
        case "next":
          await spotify.nextTrack();
          await this.pollSpotify();
          break;
        case "prev":
          await spotify.previousTrack();
          await this.pollSpotify();
          break;
        case "switch_mode": {
          if (this.state.mode === "album-art") break;
          const modes = ["wavefield", "scroll", "spectrum"] as const;
          const idx = modes.indexOf(this.state.mode as typeof modes[number]);
          this.state.mode = modes[(idx + 1) % modes.length];
          break;
        }
        case "refresh":
          await this.pollSpotify();
          break;
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
      }
    } catch (err) {
      // Show error briefly — don't crash
      const msg = err instanceof Error ? err.message : String(err);
      this.renderer.writeCenter(this.state.rows - 2, `  ERR: ${msg.slice(0, this.state.cols - 8)}  `);
    }
  }
}

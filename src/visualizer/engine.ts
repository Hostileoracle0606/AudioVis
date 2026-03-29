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
import { onCleanup } from "../utils/cleanup.js";

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
    this.theme = buildTheme(this.opts.asciiSafe, !this.opts.noColor);

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
  }

  // ---------------------------------------------------------------------------
  // Spotify polling
  // ---------------------------------------------------------------------------

  private async pollSpotify(): Promise<void> {
    try {
      const playback = await spotify.getCurrentPlayback();
      if (!playback || !playback.item) {
        this.state.trackName = "";
        this.state.artistName = "";
        this.state.deviceName = playback?.device?.name ?? "";
        this.state.isPlaying = false;
        this.state.progressMs = 0;
        this.state.durationMs = 0;
        return;
      }

      this.state.trackName = playback.item.name;
      this.state.artistName = playback.item.artists.map((a) => a.name).join(", ");
      this.state.deviceName = playback.device?.name ?? "";
      this.state.isPlaying = playback.is_playing;
      this.state.progressMs = playback.progress_ms ?? 0;
      this.state.durationMs = playback.item.duration_ms;
    } catch {
      // Network or auth error — don't crash the visualizer
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  private renderFrame(): void {
    if (!this.running) return;

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
      const titleFull = `${s.trackName}  —  ${s.artistName}`;
      const maxTitleW = Math.max(1, cols - DEVICE_PAD - 1);
      const titleLine =
        "  " + truncateMiddle(titleFull, maxTitleW - 2);
      this.renderer.write(0, 0, padRight(titleLine, cols - DEVICE_PAD));
      this.renderer.write(cols - DEVICE_PAD, 0, padLeft(deviceLabel, DEVICE_PAD));

      const stateStr = s.isPlaying ? "Playing" : "Paused";
      const elapsed = formatSeconds(s.progressMs / 1000);
      const total = formatSeconds(s.durationMs / 1000);
      const timePart = `${elapsed} / ${total}`;
      const stateLine = `  State: ${stateStr}`;
      this.renderer.write(0, 1, padRight(stateLine, cols - timePart.length - 1));
      this.renderer.write(cols - timePart.length, 1, timePart);
    } else {
      this.renderer.write(0, 0, "  Now playing: Nothing active");
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
    } else {
      renderSpectrum(s, this.renderer, layout.visualizer, this.theme);
    }

    // --- Footer ---
    const footer =
      "[space] play/pause   [n] next   [p] prev   [s] mode   [q] quit";
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
          const modes = ["wavefield", "scroll", "spectrum"] as const;
          const idx = modes.indexOf(this.state.mode as typeof modes[number]);
          this.state.mode = modes[(idx + 1) % modes.length];
          break;
        }
        case "refresh":
          await this.pollSpotify();
          break;
      }
    } catch (err) {
      // Show error briefly — don't crash
      const msg = err instanceof Error ? err.message : String(err);
      this.renderer.writeCenter(this.state.rows - 2, `  ERR: ${msg.slice(0, this.state.cols - 8)}  `);
    }
  }
}

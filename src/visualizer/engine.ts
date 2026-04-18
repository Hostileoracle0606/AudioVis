/**
 * Visualizer engine.
 *
 * Coordinates:
 *   - Analyzer frame intake → visual state
 *   - Desktop player metadata polling
 *   - Render loop
 *   - Keyboard transport controls
 */

import type { AnalysisSource } from "../analysis/AnalysisSource.js";
import { smoothBuckets, smoothValue, DEFAULT_BAR_SMOOTHING, DEFAULT_ENERGY_SMOOTHING } from "../dsp/smoothing.js";
import { createInitialState } from "./state.js";
import type { VisState, VisMode } from "./state.js";
import { getVisualizerMode, VISUALIZER_MODE_ORDER } from "./modes/index.js";
import { Renderer } from "../ui/renderer.js";
import { buildTheme } from "../ui/theme.js";
import { computeLayout, isTooSmall, tooSmallMessage } from "../ui/layout.js";
import { renderProgressBar } from "../ui/progressBar.js";
import { formatSeconds, padLeft, padRight, truncateMiddle } from "../ui/format.js";
import { enterAlternateScreen, exitAlternateScreen, getTerminalSize } from "../ui/AppScreen.js";
import { startInput, stopInput } from "../ui/input.js";
import type { Action } from "../ui/input.js";
import type { PlayerBackend } from "../player/types.js";
import { onCleanup } from "../utils/cleanup.js";
import { computePitchHue, lerpCircularHue } from "./pitchPalette.js";
import { deriveMotionFrame, derivePitchFromBars, deriveSignalStyle } from "./signalStyle.js";
import { smoothStyleProfile } from "../spotify/styleProfile.js";

export interface EngineOptions {
  mode: VisMode;
  numBars: number;
  fps: number;
  asciiSafe: boolean;
  noColor: boolean;
}

export class VisualizerEngine {
  private static readonly PLAYING_POLL_MS = 2_000;
  private static readonly IDLE_POLL_MS = 5_000;

  private readonly player: PlayerBackend;
  private readonly analysis: AnalysisSource;
  private readonly opts: EngineOptions;
  private state: VisState;
  private renderer!: Renderer;
  private theme = buildTheme(false, true);
  private running = false;
  private renderTimer: ReturnType<typeof setInterval> | null = null;
  private playerTimer: ReturnType<typeof setTimeout> | null = null;
  private playerPollInFlight = false;
  private lastFrameMs = 0;

  constructor(player: PlayerBackend, analysis: AnalysisSource, opts: EngineOptions) {
    this.player = player;
    this.analysis = analysis;
    this.opts = opts;

    const { cols, rows } = getTerminalSize();
    this.state = createInitialState(opts.mode, opts.numBars, cols, rows);
  }

  async start(): Promise<void> {
    const availability = await this.player.isAvailable();
    if (!availability.available) {
      throw new Error(availability.message || "Desktop player backend unavailable.");
    }

    this.running = true;
    this.theme = buildTheme(this.opts.asciiSafe, !this.opts.noColor, this.state.styleProfile);

    enterAlternateScreen();
    onCleanup(() => this.stop());

    const { cols, rows } = getTerminalSize();
    this.renderer = new Renderer(cols, rows);
    this.state.cols = cols;
    this.state.rows = rows;

    process.stdout.on("resize", () => {
      const { cols: c, rows: r } = getTerminalSize();
      this.renderer.resize(c, r);
      this.state.cols = c;
      this.state.rows = r;
    });

    this.analysis.onFrame((frame) => {
      if (!this.running) return;
      this.processAnalysisFrame(frame);
    });

    await this.analysis.start();

    this.lastFrameMs = Date.now();
    this.schedulePlayerPoll(0);

    const frameMs = Math.max(16, Math.round(1000 / this.opts.fps));
    this.renderTimer = setInterval(() => this.renderFrame(), frameMs);

    startInput((action) => void this.handleAction(action));
  }

  async stop(): Promise<void> {
    if (!this.running) return;
    this.running = false;

    if (this.renderTimer) clearInterval(this.renderTimer);
    if (this.playerTimer) clearTimeout(this.playerTimer);
    this.renderTimer = null;
    this.playerTimer = null;

    stopInput();
    await this.analysis.stop();
    exitAlternateScreen();
  }

  private processAnalysisFrame(
    frame: import("../analysis/AnalysisSource.js").AnalysisFrame
  ): void {
    if (this.state.rawBuckets.length !== frame.bars.length) {
      this.state.rawBuckets = new Float32Array(frame.bars.length);
      this.state.smoothedBuckets = new Float32Array(frame.bars.length);
    }

    this.state.rawBuckets.set(frame.bars);
    smoothBuckets(this.state.smoothedBuckets, frame.bars, DEFAULT_BAR_SMOOTHING);

    this.state.low = smoothValue(this.state.low, frame.low, DEFAULT_ENERGY_SMOOTHING);
    this.state.mid = smoothValue(this.state.mid, frame.mid, DEFAULT_ENERGY_SMOOTHING);
    this.state.high = smoothValue(this.state.high, frame.high, DEFAULT_ENERGY_SMOOTHING);
    this.state.amplitude = smoothValue(
      this.state.amplitude,
      frame.amplitude,
      DEFAULT_ENERGY_SMOOTHING
    );
    this.state.pulse = frame.pulse;

    const pitch = derivePitchFromBars(frame.bars);
    if (pitch) {
      this.state.targetPitchHue = pitch.hue;
      this.state.pitchSaturation = pitch.saturation;
    } else {
      const syntheticPitch = computePitchHue([
        frame.low,
        frame.low * 0.6,
        frame.mid,
        frame.mid * 0.7,
        frame.high,
        frame.high * 0.8,
        frame.high * 0.6,
        frame.mid * 0.6,
        frame.low * 0.4,
        frame.low * 0.8,
        frame.mid * 0.4,
        frame.high * 0.3,
      ]);
      if (syntheticPitch) {
        this.state.targetPitchHue = syntheticPitch.hue;
        this.state.pitchSaturation = syntheticPitch.saturation;
      }
    }

    const nextStyle = deriveSignalStyle({
      low: this.state.low,
      mid: this.state.mid,
      high: this.state.high,
      amplitude: this.state.amplitude,
      pulse: this.state.pulse,
      hue: this.state.targetPitchHue,
      saturation: this.state.pitchSaturation,
    });
    this.state.styleProfile = smoothStyleProfile(this.state.styleProfile, nextStyle, 0.12);
  }

  private async pollPlayer(): Promise<void> {
    try {
      const playback = await this.player.getState();
      if (!playback) {
        this.state.trackName = "";
        this.state.artistName = "";
        this.state.albumName = "";
        this.state.appName = "Spotify";
        this.state.isPlaying = false;
        this.state.progressMs = 0;
        this.state.durationMs = 0;
        this.state.statusMessage = "Open Spotify Desktop and start playback.";
        return;
      }

      this.state.trackName = playback.trackName;
      this.state.artistName = playback.artistName;
      this.state.albumName = playback.albumName;
      this.state.appName = playback.appName;
      this.state.isPlaying = playback.isPlaying;
      this.state.progressMs = playback.progressMs;
      this.state.durationMs = playback.durationMs;
      this.state.statusMessage = "";
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.state.trackName = "";
      this.state.artistName = "";
      this.state.albumName = "";
      this.state.isPlaying = false;
      this.state.progressMs = 0;
      this.state.durationMs = 0;
      this.state.statusMessage = msg;
    }
  }

  private schedulePlayerPoll(delayMs: number): void {
    if (!this.running) return;
    if (this.playerTimer) clearTimeout(this.playerTimer);
    this.playerTimer = setTimeout(() => void this.runPlayerPollLoop(), Math.max(0, delayMs));
  }

  private nextPlayerPollDelay(): number {
    return this.state.isPlaying
      ? VisualizerEngine.PLAYING_POLL_MS
      : VisualizerEngine.IDLE_POLL_MS;
  }

  private async runPlayerPollLoop(): Promise<void> {
    if (!this.running) return;

    if (this.playerPollInFlight) {
      this.schedulePlayerPoll(500);
      return;
    }

    this.playerPollInFlight = true;
    try {
      await this.pollPlayer();
    } finally {
      this.playerPollInFlight = false;
      if (this.running) {
        this.schedulePlayerPoll(this.nextPlayerPollDelay());
      }
    }
  }

  private requestImmediatePlayerPoll(): void {
    this.schedulePlayerPoll(0);
  }

  private renderFrame(): void {
    if (!this.running) return;

    const now = Date.now();
    if (this.lastFrameMs > 0 && this.state.isPlaying) {
      const elapsedMs = now - this.lastFrameMs;
      this.state.progressMs = Math.min(this.state.durationMs, this.state.progressMs + elapsedMs);
    }
    this.lastFrameMs = now;

    this.state.analysisFrame = deriveMotionFrame(now - this.state.startTime, this.state.pulse, this.state.isPlaying);
    this.state.pitchHue = lerpCircularHue(
      this.state.pitchHue,
      this.state.targetPitchHue,
      0.08
    );
    this.theme = buildTheme(this.opts.asciiSafe, !this.opts.noColor, this.state.styleProfile);

    const { cols, rows } = { cols: this.state.cols, rows: this.state.rows };
    this.renderer.clear();

    if (isTooSmall(cols, rows)) {
      this.renderer.writeCenter(Math.floor(rows / 2), tooSmallMessage(cols, rows));
      this.renderer.flush();
      return;
    }

    const layout = computeLayout(cols, rows);
    const s = this.state;

    const hasTrack = s.trackName.length > 0;
    const appLabel = `[${s.appName}]`;
    const appPad = appLabel.length + 1;

    if (hasTrack) {
      const titleFull = `${s.trackName}  —  ${s.artistName}`;
      const maxTitleW = Math.max(1, cols - appPad - 2);
      this.renderer.write(0, 0, padRight(truncateMiddle(titleFull, maxTitleW), cols - appPad));
      this.renderer.write(cols - appPad, 0, padLeft(appLabel, appPad));

      const stateStr = s.isPlaying ? "Playing" : "Paused";
      const elapsed = formatSeconds(s.progressMs / 1000);
      const total = formatSeconds(s.durationMs / 1000);
      const timePart = `${elapsed} / ${total}`;
      const stateLine =
        `State: ${stateStr}   Album: ${truncateMiddle(s.albumName, Math.max(8, cols - timePart.length - 20))}`;
      this.renderer.write(0, 1, padRight(stateLine, Math.max(0, cols - timePart.length - 1)));
      this.renderer.write(cols - timePart.length, 1, timePart);
    } else {
      const title = truncateMiddle(
        s.statusMessage || "Open Spotify Desktop and start playback.",
        Math.max(1, cols - 12)
      );
      this.renderer.write(0, 0, `Spotify: ${title}`);
      this.renderer.write(0, 1, "State: Idle");
    }

    const progress = s.durationMs > 0 ? s.progressMs / s.durationMs : 0;
    const barWidth = Math.min(60, cols - 4);
    this.renderer.writeCenter(layout.progress.y, renderProgressBar(progress, barWidth));

    const mode = getVisualizerMode(s.mode);
    mode.prepare?.(s, layout.visualizer);
    mode.render(s, this.renderer, layout.visualizer, this.theme);

    const controls =
      "[space] play/pause   [n] next   [p] prev   [s] mode   [r] refresh   [q] quit";
    const modeTag = `[mode: ${mode.label}]`;
    if (cols >= controls.length + modeTag.length + 3) {
      this.renderer.write(0, layout.footer.y, padRight(controls, cols - modeTag.length - 1));
      this.renderer.write(cols - modeTag.length, layout.footer.y, modeTag);
    } else {
      this.renderer.writeCenter(
        layout.footer.y,
        truncateMiddle(`${controls}   ${modeTag}`, cols)
      );
    }
    this.renderer.flush();
  }

  private async handleAction(action: Action): Promise<void> {
    try {
      switch (action) {
        case "quit":
          await this.stop();
          process.exit(0);
          break;
        case "toggle_play":
          if (this.state.isPlaying) await this.player.pause();
          else await this.player.play();
          this.requestImmediatePlayerPoll();
          break;
        case "next":
          await this.player.next();
          this.requestImmediatePlayerPoll();
          break;
        case "prev":
          await this.player.previous();
          this.requestImmediatePlayerPoll();
          break;
        case "switch_mode": {
          const idx = VISUALIZER_MODE_ORDER.indexOf(this.state.mode);
          this.state.mode = VISUALIZER_MODE_ORDER[(idx + 1) % VISUALIZER_MODE_ORDER.length];
          break;
        }
        case "refresh":
          this.requestImmediatePlayerPoll();
          break;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.state.statusMessage = msg;
      this.renderer.writeCenter(
        this.state.rows - 2,
        `  ERR: ${msg.slice(0, Math.max(1, this.state.cols - 8))}  `
      );
    }
  }
}

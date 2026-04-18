"use strict";
/**
 * Visualizer engine.
 *
 * Coordinates:
 *   - Analyzer frame intake → visual state
 *   - Desktop player metadata polling
 *   - Render loop
 *   - Keyboard transport controls
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisualizerEngine = void 0;
const smoothing_js_1 = require("../dsp/smoothing.js");
const state_js_1 = require("./state.js");
const index_js_1 = require("./modes/index.js");
const renderer_js_1 = require("../ui/renderer.js");
const theme_js_1 = require("../ui/theme.js");
const layout_js_1 = require("../ui/layout.js");
const progressBar_js_1 = require("../ui/progressBar.js");
const format_js_1 = require("../ui/format.js");
const AppScreen_js_1 = require("../ui/AppScreen.js");
const input_js_1 = require("../ui/input.js");
const cleanup_js_1 = require("../utils/cleanup.js");
const pitchPalette_js_1 = require("./pitchPalette.js");
const signalStyle_js_1 = require("./signalStyle.js");
const styleProfile_js_1 = require("../spotify/styleProfile.js");
class VisualizerEngine {
    static PLAYING_POLL_MS = 2_000;
    static IDLE_POLL_MS = 5_000;
    player;
    analysis;
    opts;
    state;
    renderer;
    theme = (0, theme_js_1.buildTheme)(false, true);
    running = false;
    renderTimer = null;
    playerTimer = null;
    playerPollInFlight = false;
    lastFrameMs = 0;
    constructor(player, analysis, opts) {
        this.player = player;
        this.analysis = analysis;
        this.opts = opts;
        const { cols, rows } = (0, AppScreen_js_1.getTerminalSize)();
        this.state = (0, state_js_1.createInitialState)(opts.mode, opts.numBars, cols, rows);
    }
    async start() {
        const availability = await this.player.isAvailable();
        if (!availability.available) {
            throw new Error(availability.message || "Desktop player backend unavailable.");
        }
        this.running = true;
        this.theme = (0, theme_js_1.buildTheme)(this.opts.asciiSafe, !this.opts.noColor, this.state.styleProfile);
        (0, AppScreen_js_1.enterAlternateScreen)();
        (0, cleanup_js_1.onCleanup)(() => this.stop());
        const { cols, rows } = (0, AppScreen_js_1.getTerminalSize)();
        this.renderer = new renderer_js_1.Renderer(cols, rows);
        this.state.cols = cols;
        this.state.rows = rows;
        process.stdout.on("resize", () => {
            const { cols: c, rows: r } = (0, AppScreen_js_1.getTerminalSize)();
            this.renderer.resize(c, r);
            this.state.cols = c;
            this.state.rows = r;
        });
        this.analysis.onFrame((frame) => {
            if (!this.running)
                return;
            this.processAnalysisFrame(frame);
        });
        await this.analysis.start();
        this.lastFrameMs = Date.now();
        this.schedulePlayerPoll(0);
        const frameMs = Math.max(16, Math.round(1000 / this.opts.fps));
        this.renderTimer = setInterval(() => this.renderFrame(), frameMs);
        (0, input_js_1.startInput)((action) => void this.handleAction(action));
    }
    async stop() {
        if (!this.running)
            return;
        this.running = false;
        if (this.renderTimer)
            clearInterval(this.renderTimer);
        if (this.playerTimer)
            clearTimeout(this.playerTimer);
        this.renderTimer = null;
        this.playerTimer = null;
        (0, input_js_1.stopInput)();
        await this.analysis.stop();
        (0, AppScreen_js_1.exitAlternateScreen)();
    }
    processAnalysisFrame(frame) {
        if (this.state.rawBuckets.length !== frame.bars.length) {
            this.state.rawBuckets = new Float32Array(frame.bars.length);
            this.state.smoothedBuckets = new Float32Array(frame.bars.length);
        }
        this.state.rawBuckets.set(frame.bars);
        (0, smoothing_js_1.smoothBuckets)(this.state.smoothedBuckets, frame.bars, smoothing_js_1.DEFAULT_BAR_SMOOTHING);
        this.state.low = (0, smoothing_js_1.smoothValue)(this.state.low, frame.low, smoothing_js_1.DEFAULT_ENERGY_SMOOTHING);
        this.state.mid = (0, smoothing_js_1.smoothValue)(this.state.mid, frame.mid, smoothing_js_1.DEFAULT_ENERGY_SMOOTHING);
        this.state.high = (0, smoothing_js_1.smoothValue)(this.state.high, frame.high, smoothing_js_1.DEFAULT_ENERGY_SMOOTHING);
        this.state.amplitude = (0, smoothing_js_1.smoothValue)(this.state.amplitude, frame.amplitude, smoothing_js_1.DEFAULT_ENERGY_SMOOTHING);
        this.state.pulse = frame.pulse;
        const pitch = (0, signalStyle_js_1.derivePitchFromBars)(frame.bars);
        if (pitch) {
            this.state.targetPitchHue = pitch.hue;
            this.state.pitchSaturation = pitch.saturation;
        }
        else {
            const syntheticPitch = (0, pitchPalette_js_1.computePitchHue)([
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
        const nextStyle = (0, signalStyle_js_1.deriveSignalStyle)({
            low: this.state.low,
            mid: this.state.mid,
            high: this.state.high,
            amplitude: this.state.amplitude,
            pulse: this.state.pulse,
            hue: this.state.targetPitchHue,
            saturation: this.state.pitchSaturation,
        });
        this.state.styleProfile = (0, styleProfile_js_1.smoothStyleProfile)(this.state.styleProfile, nextStyle, 0.12);
    }
    async pollPlayer() {
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
        }
        catch (err) {
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
    schedulePlayerPoll(delayMs) {
        if (!this.running)
            return;
        if (this.playerTimer)
            clearTimeout(this.playerTimer);
        this.playerTimer = setTimeout(() => void this.runPlayerPollLoop(), Math.max(0, delayMs));
    }
    nextPlayerPollDelay() {
        return this.state.isPlaying
            ? VisualizerEngine.PLAYING_POLL_MS
            : VisualizerEngine.IDLE_POLL_MS;
    }
    async runPlayerPollLoop() {
        if (!this.running)
            return;
        if (this.playerPollInFlight) {
            this.schedulePlayerPoll(500);
            return;
        }
        this.playerPollInFlight = true;
        try {
            await this.pollPlayer();
        }
        finally {
            this.playerPollInFlight = false;
            if (this.running) {
                this.schedulePlayerPoll(this.nextPlayerPollDelay());
            }
        }
    }
    requestImmediatePlayerPoll() {
        this.schedulePlayerPoll(0);
    }
    renderFrame() {
        if (!this.running)
            return;
        const now = Date.now();
        if (this.lastFrameMs > 0 && this.state.isPlaying) {
            const elapsedMs = now - this.lastFrameMs;
            this.state.progressMs = Math.min(this.state.durationMs, this.state.progressMs + elapsedMs);
        }
        this.lastFrameMs = now;
        this.state.analysisFrame = (0, signalStyle_js_1.deriveMotionFrame)(now - this.state.startTime, this.state.pulse, this.state.isPlaying);
        this.state.pitchHue = (0, pitchPalette_js_1.lerpCircularHue)(this.state.pitchHue, this.state.targetPitchHue, 0.08);
        this.theme = (0, theme_js_1.buildTheme)(this.opts.asciiSafe, !this.opts.noColor, this.state.styleProfile);
        const { cols, rows } = { cols: this.state.cols, rows: this.state.rows };
        this.renderer.clear();
        if ((0, layout_js_1.isTooSmall)(cols, rows)) {
            this.renderer.writeCenter(Math.floor(rows / 2), (0, layout_js_1.tooSmallMessage)(cols, rows));
            this.renderer.flush();
            return;
        }
        const layout = (0, layout_js_1.computeLayout)(cols, rows);
        const s = this.state;
        const hasTrack = s.trackName.length > 0;
        const appLabel = `[${s.appName}]`;
        const appPad = appLabel.length + 1;
        if (hasTrack) {
            const titleFull = `${s.trackName}  —  ${s.artistName}`;
            const maxTitleW = Math.max(1, cols - appPad - 2);
            this.renderer.write(0, 0, (0, format_js_1.padRight)((0, format_js_1.truncateMiddle)(titleFull, maxTitleW), cols - appPad));
            this.renderer.write(cols - appPad, 0, (0, format_js_1.padLeft)(appLabel, appPad));
            const stateStr = s.isPlaying ? "Playing" : "Paused";
            const elapsed = (0, format_js_1.formatSeconds)(s.progressMs / 1000);
            const total = (0, format_js_1.formatSeconds)(s.durationMs / 1000);
            const timePart = `${elapsed} / ${total}`;
            const stateLine = `State: ${stateStr}   Album: ${(0, format_js_1.truncateMiddle)(s.albumName, Math.max(8, cols - timePart.length - 20))}`;
            this.renderer.write(0, 1, (0, format_js_1.padRight)(stateLine, Math.max(0, cols - timePart.length - 1)));
            this.renderer.write(cols - timePart.length, 1, timePart);
        }
        else {
            const title = (0, format_js_1.truncateMiddle)(s.statusMessage || "Open Spotify Desktop and start playback.", Math.max(1, cols - 12));
            this.renderer.write(0, 0, `Spotify: ${title}`);
            this.renderer.write(0, 1, "State: Idle");
        }
        const progress = s.durationMs > 0 ? s.progressMs / s.durationMs : 0;
        const barWidth = Math.min(60, cols - 4);
        this.renderer.writeCenter(layout.progress.y, (0, progressBar_js_1.renderProgressBar)(progress, barWidth));
        const mode = (0, index_js_1.getVisualizerMode)(s.mode);
        mode.prepare?.(s, layout.visualizer);
        mode.render(s, this.renderer, layout.visualizer, this.theme);
        const controls = "[space] play/pause   [n] next   [p] prev   [s] mode   [r] refresh   [q] quit";
        const modeTag = `[mode: ${mode.label}]`;
        if (cols >= controls.length + modeTag.length + 3) {
            this.renderer.write(0, layout.footer.y, (0, format_js_1.padRight)(controls, cols - modeTag.length - 1));
            this.renderer.write(cols - modeTag.length, layout.footer.y, modeTag);
        }
        else {
            this.renderer.writeCenter(layout.footer.y, (0, format_js_1.truncateMiddle)(`${controls}   ${modeTag}`, cols));
        }
        this.renderer.flush();
    }
    async handleAction(action) {
        try {
            switch (action) {
                case "quit":
                    await this.stop();
                    process.exit(0);
                    break;
                case "toggle_play":
                    if (this.state.isPlaying)
                        await this.player.pause();
                    else
                        await this.player.play();
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
                    const idx = index_js_1.VISUALIZER_MODE_ORDER.indexOf(this.state.mode);
                    this.state.mode = index_js_1.VISUALIZER_MODE_ORDER[(idx + 1) % index_js_1.VISUALIZER_MODE_ORDER.length];
                    break;
                }
                case "refresh":
                    this.requestImmediatePlayerPoll();
                    break;
            }
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.state.statusMessage = msg;
            this.renderer.writeCenter(this.state.rows - 2, `  ERR: ${msg.slice(0, Math.max(1, this.state.cols - 8))}  `);
        }
    }
}
exports.VisualizerEngine = VisualizerEngine;
//# sourceMappingURL=engine.js.map
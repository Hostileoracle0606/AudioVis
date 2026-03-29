"use strict";
/**
 * Visualizer engine.
 *
 * Coordinates:
 *   - Audio frame intake → DSP pipeline
 *   - Spotify metadata polling (1 Hz)
 *   - Render loop (target 30 FPS)
 *   - Keyboard input actions
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisualizerEngine = void 0;
const fft_js_1 = require("../dsp/fft.js");
const buckets_js_1 = require("../dsp/buckets.js");
const smoothing_js_1 = require("../dsp/smoothing.js");
const features_js_1 = require("../dsp/features.js");
const state_js_1 = require("./state.js");
const wavefield_js_1 = require("./modes/wavefield.js");
const scroll_js_1 = require("./modes/scroll.js");
const spectrum_js_1 = require("./modes/spectrum.js");
const renderer_js_1 = require("../ui/renderer.js");
const theme_js_1 = require("../ui/theme.js");
const layout_js_1 = require("../ui/layout.js");
const progressBar_js_1 = require("../ui/progressBar.js");
const format_js_1 = require("../ui/format.js");
const AppScreen_js_1 = require("../ui/AppScreen.js");
const input_js_1 = require("../ui/input.js");
const spotify = __importStar(require("../spotify/client.js"));
const cleanup_js_1 = require("../utils/cleanup.js");
class VisualizerEngine {
    audio;
    opts;
    state;
    renderer;
    theme = (0, theme_js_1.buildTheme)(false, true);
    peak = { value: 1e-6 };
    running = false;
    renderTimer = null;
    spotifyTimer = null;
    lastFrameMs = 0;
    constructor(audio, opts) {
        this.audio = audio;
        this.opts = opts;
        const { cols, rows } = (0, AppScreen_js_1.getTerminalSize)();
        this.state = (0, state_js_1.createInitialState)(opts.mode, opts.numBars, cols, rows);
    }
    async start() {
        this.running = true;
        this.theme = (0, theme_js_1.buildTheme)(this.opts.asciiSafe, !this.opts.noColor);
        // Set up terminal
        (0, AppScreen_js_1.enterAlternateScreen)();
        (0, cleanup_js_1.onCleanup)(() => this.stop());
        const { cols, rows } = (0, AppScreen_js_1.getTerminalSize)();
        this.renderer = new renderer_js_1.Renderer(cols, rows);
        this.state.cols = cols;
        this.state.rows = rows;
        // Handle terminal resize
        process.stdout.on("resize", () => {
            const { cols: c, rows: r } = (0, AppScreen_js_1.getTerminalSize)();
            this.renderer.resize(c, r);
            this.state.cols = c;
            this.state.rows = r;
            this.state.scrollHistory = new Float32Array(c);
        });
        // Wire audio frames into DSP pipeline
        this.audio.onFrame((frame) => {
            if (!this.running)
                return;
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
        (0, input_js_1.startInput)((action) => void this.handleAction(action));
    }
    async stop() {
        if (!this.running)
            return;
        this.running = false;
        if (this.renderTimer)
            clearInterval(this.renderTimer);
        if (this.spotifyTimer)
            clearInterval(this.spotifyTimer);
        this.renderTimer = null;
        this.spotifyTimer = null;
        (0, input_js_1.stopInput)();
        await this.audio.stop();
        (0, AppScreen_js_1.exitAlternateScreen)();
    }
    // ---------------------------------------------------------------------------
    // DSP
    // ---------------------------------------------------------------------------
    processAudioFrame(frame) {
        const mags = (0, fft_js_1.computeMagnitudeSpectrum)(frame);
        // Compute raw buckets and smooth them
        const raw = (0, buckets_js_1.computeBuckets)(mags, this.opts.numBars, this.opts.sampleRate, this.peak);
        if (this.state.rawBuckets.length !== raw.length) {
            this.state.rawBuckets = new Float32Array(raw.length);
            this.state.smoothedBuckets = new Float32Array(raw.length);
        }
        this.state.rawBuckets.set(raw);
        (0, smoothing_js_1.smoothBuckets)(this.state.smoothedBuckets, raw, smoothing_js_1.DEFAULT_BAR_SMOOTHING);
        // Energy features
        const features = (0, features_js_1.extractFeatures)(mags, this.opts.sampleRate);
        this.state.low = (0, smoothing_js_1.smoothValue)(this.state.low, features.low, smoothing_js_1.DEFAULT_ENERGY_SMOOTHING);
        this.state.mid = (0, smoothing_js_1.smoothValue)(this.state.mid, features.mid, smoothing_js_1.DEFAULT_ENERGY_SMOOTHING);
        this.state.high = (0, smoothing_js_1.smoothValue)(this.state.high, features.high, smoothing_js_1.DEFAULT_ENERGY_SMOOTHING);
        this.state.amplitude = (0, smoothing_js_1.smoothValue)(this.state.amplitude, features.rms, smoothing_js_1.DEFAULT_ENERGY_SMOOTHING);
        this.state.pulse = features.pulse; // don't smooth pulse — it should be sharp
    }
    // ---------------------------------------------------------------------------
    // Spotify polling
    // ---------------------------------------------------------------------------
    async pollSpotify() {
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
        }
        catch {
            // Network or auth error — don't crash the visualizer
        }
    }
    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------
    renderFrame() {
        if (!this.running)
            return;
        const { cols, rows } = { cols: this.state.cols, rows: this.state.rows };
        this.renderer.clear();
        if ((0, layout_js_1.isTooSmall)(cols, rows)) {
            this.renderer.writeCenter(Math.floor(rows / 2), (0, layout_js_1.tooSmallMessage)(cols, rows));
            this.renderer.flush();
            return;
        }
        const layout = (0, layout_js_1.computeLayout)(cols, rows);
        const s = this.state;
        // --- Header ---
        const hasTrack = s.trackName.length > 0;
        const deviceLabel = s.deviceName ? `[${s.deviceName}]` : "";
        const DEVICE_PAD = deviceLabel.length + 1;
        if (hasTrack) {
            const titleFull = `${s.trackName}  —  ${s.artistName}`;
            const maxTitleW = Math.max(1, cols - DEVICE_PAD - 1);
            const titleLine = "  " + (0, format_js_1.truncateMiddle)(titleFull, maxTitleW - 2);
            this.renderer.write(0, 0, (0, format_js_1.padRight)(titleLine, cols - DEVICE_PAD));
            this.renderer.write(cols - DEVICE_PAD, 0, (0, format_js_1.padLeft)(deviceLabel, DEVICE_PAD));
            const stateStr = s.isPlaying ? "Playing" : "Paused";
            const elapsed = (0, format_js_1.formatSeconds)(s.progressMs / 1000);
            const total = (0, format_js_1.formatSeconds)(s.durationMs / 1000);
            const timePart = `${elapsed} / ${total}`;
            const stateLine = `  State: ${stateStr}`;
            this.renderer.write(0, 1, (0, format_js_1.padRight)(stateLine, cols - timePart.length - 1));
            this.renderer.write(cols - timePart.length, 1, timePart);
        }
        else {
            this.renderer.write(0, 0, "  Now playing: Nothing active");
            this.renderer.write(0, 1, "  State: Idle");
        }
        // --- Progress bar ---
        const progress = s.durationMs > 0 ? s.progressMs / s.durationMs : 0;
        const barWidth = Math.min(60, cols - 4);
        const bar = (0, progressBar_js_1.renderProgressBar)(progress, barWidth);
        this.renderer.writeCenter(layout.progress.y, bar);
        // --- Visualizer ---
        (0, scroll_js_1.pushScrollHistory)(s, layout.visualizer.width);
        if (s.mode === "wavefield") {
            (0, wavefield_js_1.renderWavefield)(s, this.renderer, layout.visualizer, this.theme);
        }
        else if (s.mode === "scroll") {
            (0, scroll_js_1.renderScroll)(s, this.renderer, layout.visualizer, this.theme);
        }
        else {
            (0, spectrum_js_1.renderSpectrum)(s, this.renderer, layout.visualizer, this.theme);
        }
        // --- Footer ---
        const footer = "[space] play/pause   [n] next   [p] prev   [s] mode   [q] quit";
        this.renderer.writeCenter(layout.footer.y, footer);
        this.renderer.flush();
    }
    // ---------------------------------------------------------------------------
    // Input handling
    // ---------------------------------------------------------------------------
    async handleAction(action) {
        try {
            switch (action) {
                case "quit":
                    await this.stop();
                    process.exit(0);
                    break;
                case "toggle_play":
                    if (this.state.isPlaying)
                        await spotify.pause();
                    else
                        await spotify.play();
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
                    const modes = ["wavefield", "scroll", "spectrum"];
                    const idx = modes.indexOf(this.state.mode);
                    this.state.mode = modes[(idx + 1) % modes.length];
                    break;
                }
                case "refresh":
                    await this.pollSpotify();
                    break;
            }
        }
        catch (err) {
            // Show error briefly — don't crash
            const msg = err instanceof Error ? err.message : String(err);
            this.renderer.writeCenter(this.state.rows - 2, `  ERR: ${msg.slice(0, this.state.cols - 8)}  `);
        }
    }
}
exports.VisualizerEngine = VisualizerEngine;
//# sourceMappingURL=engine.js.map
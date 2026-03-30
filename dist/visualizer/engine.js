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
const styleProfile_js_1 = require("../spotify/styleProfile.js");
const cleanup_js_1 = require("../utils/cleanup.js");
const fetcher_js_1 = require("../album/fetcher.js");
const converter_js_1 = require("../album/converter.js");
const cache_js_1 = require("../album/cache.js");
const albumArt_js_1 = require("./modes/albumArt.js");
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
        this.theme = (0, theme_js_1.buildTheme)(this.opts.asciiSafe, !this.opts.noColor, this.state.styleProfile);
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
            // Force art reconversion at new size on next poll
            if (this.state.albumArt && this.state.albumArt.cols !== c) {
                this.state.albumArtUrl = "";
                this.state.albumArt = null;
            }
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
        this.state.styleProfile = (0, styleProfile_js_1.smoothStyleProfile)(this.state.styleProfile, {
            ...this.state.styleProfile,
            glitch: Math.min(1, this.state.styleProfile.glitch * 0.92 +
                features.high * 0.03 +
                features.pulse * 0.09),
            aggression: Math.min(1, this.state.styleProfile.aggression * 0.94 +
                features.low * 0.03 +
                features.pulse * 0.06),
            density: Math.min(1, this.state.styleProfile.density * 0.95 + features.rms * 0.04),
            groove: Math.min(1, this.state.styleProfile.groove * 0.96 +
                features.low * 0.02 +
                features.mid * 0.01),
        }, 0.08);
    }
    // ---------------------------------------------------------------------------
    // Spotify polling
    // ---------------------------------------------------------------------------
    async pollSpotify() {
        try {
            const playback = await spotify.getCurrentPlayback();
            if (!playback || !playback.item) {
                this.state.trackName = "";
                this.state.trackId = "";
                this.state.artistName = "";
                this.state.albumName = "";
                this.state.deviceName = playback?.device?.name ?? "";
                this.state.isPlaying = false;
                this.state.progressMs = 0;
                this.state.durationMs = 0;
                this.state.spotifyStatus = "No active Spotify playback";
                this.state.analysis = null;
                this.state.albumArtUrl = "";
                this.state.albumArt = null;
                return;
            }
            const previousTrackId = this.state.trackId;
            this.state.trackId = playback.item.id;
            this.state.trackName = playback.item.name;
            this.state.artistName = playback.item.artists.map((a) => a.name).join(", ");
            this.state.albumName = playback.item.album.name;
            this.state.deviceName = playback.device?.name ?? "";
            this.state.isPlaying = playback.is_playing;
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
                this.state.styleProfile = (0, styleProfile_js_1.inferStyleProfile)({
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
                const cached = (0, cache_js_1.getCached)(playback.item.id);
                if (cached && cached.cols === this.state.cols) {
                    this.state.albumArt = cached;
                }
                else {
                    const trackId = playback.item.id;
                    const cols = this.state.cols;
                    const noColor = this.opts.noColor;
                    const layout = (0, layout_js_1.computeLayout)(cols, this.state.rows);
                    const vizH = layout.visualizer.height;
                    (0, fetcher_js_1.fetchImageBuffer)(imageUrl)
                        .then((buf) => (0, converter_js_1.convertToAscii)(buf, trackId, cols, vizH, noColor))
                        .then((art) => {
                        (0, cache_js_1.setCached)(trackId, art);
                        if (this.state.albumArtUrl === imageUrl) {
                            this.state.albumArt = art;
                        }
                    })
                        .catch(() => {
                        // Network/decode failure — no art, no crash
                    });
                }
            }
        }
        catch (err) {
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
    syncAnalysisFrame() {
        const { analysis, progressMs } = this.state;
        if (!analysis) {
            return;
        }
        const playbackSeconds = progressMs / 1000;
        const advanceIndex = (collection, currentIndex) => {
            if (collection.length === 0)
                return 0;
            let index = Math.max(0, Math.min(currentIndex, collection.length - 1));
            while (index + 1 < collection.length && playbackSeconds >= collection[index + 1].start) {
                index += 1;
            }
            while (index > 0 && playbackSeconds < collection[index].start) {
                index -= 1;
            }
            return index;
        };
        this.state.currentSegmentIndex = advanceIndex(analysis.segments, this.state.currentSegmentIndex);
        this.state.currentBeatIndex = advanceIndex(analysis.beats, this.state.currentBeatIndex);
        this.state.currentTatumIndex = advanceIndex(analysis.tatums, this.state.currentTatumIndex);
        this.state.currentSectionIndex = advanceIndex(analysis.sections, this.state.currentSectionIndex);
        this.state.analysisFrame = (0, styleProfile_js_1.buildAnalysisFrame)({
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
    renderFrame() {
        if (!this.running)
            return;
        this.syncAnalysisFrame();
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
        // --- Header ---
        const hasTrack = s.trackName.length > 0;
        const deviceLabel = s.deviceName ? `[${s.deviceName}]` : "";
        const DEVICE_PAD = deviceLabel.length + 1;
        if (hasTrack) {
            // Thumbnail (4×2 icon) — left of track name
            if (s.albumArt) {
                this.renderer.write(0, 0, s.albumArt.thumbnail[0] ?? "    ");
                this.renderer.write(0, 1, s.albumArt.thumbnail[1] ?? "    ");
            }
            else {
                this.renderer.write(0, 0, "    ");
                this.renderer.write(0, 1, "    ");
            }
            const titleFull = `${s.trackName}  —  ${s.artistName}`;
            const maxTitleW = Math.max(1, cols - DEVICE_PAD - 6);
            const titleLine = "  " + (0, format_js_1.truncateMiddle)(titleFull, maxTitleW - 2);
            this.renderer.write(5, 0, (0, format_js_1.padRight)(titleLine, cols - DEVICE_PAD - 5));
            this.renderer.write(cols - DEVICE_PAD, 0, (0, format_js_1.padLeft)(deviceLabel, DEVICE_PAD));
            const stateStr = s.isPlaying ? "Playing" : "Paused";
            const elapsed = (0, format_js_1.formatSeconds)(s.progressMs / 1000);
            const total = (0, format_js_1.formatSeconds)(s.durationMs / 1000);
            const timePart = `${elapsed} / ${total}`;
            const stateLine = `  State: ${stateStr}   Style: ${(0, format_js_1.truncateMiddle)(s.styleProfile.label, 24)}   Pitch: ${s.styleProfile.dominantPitchLabel}`;
            this.renderer.write(5, 1, (0, format_js_1.padRight)(stateLine, cols - timePart.length - 6));
            this.renderer.write(cols - timePart.length, 1, timePart);
        }
        else {
            const title = (0, format_js_1.truncateMiddle)(s.spotifyStatus || "No active Spotify playback", Math.max(1, cols - 18));
            this.renderer.write(0, 0, `  Spotify: ${title}`);
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
        else if (s.mode === "album-art") {
            (0, albumArt_js_1.renderAlbumArt)(s, this.renderer, layout.visualizer, this.theme);
        }
        else {
            (0, spectrum_js_1.renderSpectrum)(s, this.renderer, layout.visualizer, this.theme);
        }
        // --- Footer ---
        const footer = "[space] play/pause   [n] next   [p] prev   [s] mode   [a] art   [q] quit";
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
                    if (this.state.mode === "album-art")
                        break;
                    const modes = ["wavefield", "scroll", "spectrum"];
                    const idx = modes.indexOf(this.state.mode);
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
                    }
                    else {
                        this.state.mode = this.state.priorMode;
                    }
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
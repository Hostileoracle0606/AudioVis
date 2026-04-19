"use strict";
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
const renderer_js_1 = require("../ui/renderer.js");
const theme_js_1 = require("../ui/theme.js");
const layout_js_1 = require("../ui/layout.js");
const AppScreen_js_1 = require("../ui/AppScreen.js");
const input_js_1 = require("../ui/input.js");
const tui_js_1 = require("../ui/tui.js");
const spotifyDesktop = __importStar(require("../macos/spotifyDesktop.js"));
const cleanup_js_1 = require("../utils/cleanup.js");
const fetcher_js_1 = require("../album/fetcher.js");
const converter_js_1 = require("../album/converter.js");
const cache_js_1 = require("../album/cache.js");
const cava_js_1 = require("../audio/cava.js");
const lrclib_js_1 = require("../lyrics/lrclib.js");
const songFeatures_js_1 = require("../dsp/songFeatures.js");
const songTheme_js_1 = require("./songTheme.js");
const layout_js_2 = require("../ui/layout.js");
// Widgets
const searchBar_js_1 = require("./widgets/searchBar.js");
const recordDeck_js_1 = require("./widgets/recordDeck.js");
const lyricsTerminal_js_1 = require("./widgets/lyricsTerminal.js");
const wavePanel_js_1 = require("./widgets/wavePanel.js");
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
    cava = null;
    songTracker = new songFeatures_js_1.SongFeatureTracker();
    themeRefreshCounter = 0;
    constructor(audio, opts) {
        this.audio = audio;
        this.opts = opts;
        const { cols, rows } = (0, AppScreen_js_1.getTerminalSize)();
        this.state = (0, state_js_1.createInitialState)(opts.mode, opts.numBars, cols, rows);
    }
    // ── lifecycle ──────────────────────────────────────────────────────────────
    async start() {
        this.running = true;
        this.theme = (0, theme_js_1.buildTheme)(this.opts.asciiSafe, !this.opts.noColor);
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
            this.state.scrollHistory = new Float32Array(c);
            // Force art reconversion on next poll
            if (this.state.albumArt && this.state.albumArt.cols !== c) {
                this.state.albumArtUrl = "";
                this.state.albumArt = null;
            }
        });
        // Audio → DSP
        this.audio.onFrame((frame) => {
            if (!this.running)
                return;
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
        this.cava?.stop();
        this.cava = null;
        (0, input_js_1.stopInput)();
        await this.audio.stop();
        (0, AppScreen_js_1.exitAlternateScreen)();
    }
    // ── cava ──────────────────────────────────────────────────────────────────
    startCava() {
        const numBars = Math.max(8, Math.min(32, this.opts.numBars));
        this.cava = new cava_js_1.CavaStream(numBars, this.opts.fps);
        this.cava.on("frame", (bars) => {
            if (!this.running)
                return;
            this.state.cavaBars = bars;
            this.state.cavaActive = true;
        });
        this.cava.on("unavailable", (_reason) => {
            // cava not installed — wave panel will use smoothedBuckets
            this.cava = null;
        });
        this.cava.start();
    }
    // ── DSP ───────────────────────────────────────────────────────────────────
    processAudioFrame(frame) {
        const mags = (0, fft_js_1.computeMagnitudeSpectrum)(frame);
        const raw = (0, buckets_js_1.computeBuckets)(mags, this.opts.numBars, this.opts.sampleRate, this.peak);
        if (this.state.rawBuckets.length !== raw.length) {
            this.state.rawBuckets = new Float32Array(raw.length);
            this.state.smoothedBuckets = new Float32Array(raw.length);
        }
        this.state.rawBuckets.set(raw);
        (0, smoothing_js_1.smoothBuckets)(this.state.smoothedBuckets, raw, smoothing_js_1.DEFAULT_BAR_SMOOTHING);
        const features = (0, features_js_1.extractFeatures)(mags, this.opts.sampleRate);
        this.state.low = (0, smoothing_js_1.smoothValue)(this.state.low, features.low, smoothing_js_1.DEFAULT_ENERGY_SMOOTHING);
        this.state.mid = (0, smoothing_js_1.smoothValue)(this.state.mid, features.mid, smoothing_js_1.DEFAULT_ENERGY_SMOOTHING);
        this.state.high = (0, smoothing_js_1.smoothValue)(this.state.high, features.high, smoothing_js_1.DEFAULT_ENERGY_SMOOTHING);
        this.state.amplitude = (0, smoothing_js_1.smoothValue)(this.state.amplitude, features.rms, smoothing_js_1.DEFAULT_ENERGY_SMOOTHING);
        this.state.pulse = features.pulse;
        const now = Date.now();
        if (features.pulse > 0.35) {
            this.state.lastPulseMs = now;
            this.state.lastPulseStrength = Math.min(1, features.pulse);
            this.state.ringQueue.push({ ms: now, strength: features.pulse });
            if (this.state.ringQueue.length > 4)
                this.state.ringQueue.shift();
        }
        this.state.ringQueue = this.state.ringQueue.filter((r) => now - r.ms < 1200);
        this.songTracker.update(this.state.low, this.state.mid, this.state.high, this.state.amplitude, features.pulse, now);
        this.state.songFeatures = this.songTracker.features;
    }
    // ── Spotify polling ───────────────────────────────────────────────────────
    async pollSpotify() {
        try {
            const st = await spotifyDesktop.getState();
            if (!st) {
                this.state.trackName = "";
                this.state.artistName = "";
                this.state.albumName = "";
                this.state.deviceName = "";
                this.state.isPlaying = false;
                this.state.progressMs = 0;
                this.state.durationMs = 0;
                this.state.albumArtUrl = "";
                this.state.albumArt = null;
                return;
            }
            this.state.trackName = st.trackName;
            this.state.artistName = st.artistName;
            this.state.albumName = st.albumName;
            this.state.deviceName = st.deviceName;
            this.state.isPlaying = st.isPlaying;
            this.state.progressMs = st.progressMs;
            this.state.durationMs = st.durationMs;
            // Track-change detection
            const trackKey = `${st.trackName}:::${st.artistName}`;
            if (trackKey !== this.state.currentTrackId) {
                this.state.currentTrackId = trackKey;
                this.songTracker.reset();
                this.state.particles = [];
                this.state.ringQueue = [];
                this.rebuildSongTheme();
                // Kick off lyrics fetch for the new track
                void this.fetchLyricsForTrack(st.trackName, st.artistName, st.albumName, trackKey);
            }
            // Album art
            const imageUrl = st.albumArtUrl;
            if (imageUrl && imageUrl !== this.state.albumArtUrl) {
                this.state.albumArtUrl = imageUrl;
                const cached = (0, cache_js_1.getCached)(trackKey);
                if (cached && cached.cols === this.state.cols) {
                    this.state.albumArt = cached;
                }
                else {
                    const cols = this.state.cols;
                    const noColor = this.opts.noColor;
                    const layout = (0, layout_js_2.computeLayout)(cols, this.state.rows);
                    const vizH = layout.visualizer.height;
                    (0, fetcher_js_1.fetchImageBuffer)(imageUrl)
                        .then((buf) => (0, converter_js_1.convertToAscii)(buf, trackKey, cols, vizH, noColor))
                        .then((art) => {
                        (0, cache_js_1.setCached)(trackKey, art);
                        if (this.state.albumArtUrl === imageUrl) {
                            this.state.albumArt = art;
                        }
                    })
                        .catch(() => { });
                }
            }
        }
        catch {
            // Desktop query failed — don't crash
        }
    }
    // ── Lyrics ────────────────────────────────────────────────────────────────
    async fetchLyricsForTrack(track, artist, album, key) {
        this.state.lrcLines = [];
        this.state.activeLyricIdx = 0;
        this.state.lyricRevealedChars = 0;
        this.state.lyricRevealStartMs = 0;
        this.state.lyricFetchKey = key;
        this.state.lyricFetchState = "fetching";
        const lines = await (0, lrclib_js_1.fetchLyrics)(track, artist, album);
        // Guard: track might have changed while we awaited
        if (this.state.lyricFetchKey !== key)
            return;
        if (lines.length > 0) {
            this.state.lrcLines = lines;
            this.state.lyricFetchState = "ready";
        }
        else {
            this.state.lyricFetchState = "none";
        }
    }
    // ── Song theme ────────────────────────────────────────────────────────────
    rebuildSongTheme() {
        const base = { dim: this.theme.dim, normal: this.theme.normal, bright: this.theme.bright, reset: this.theme.reset };
        this.state.songTheme = this.state.currentTrackId
            ? (0, songTheme_js_1.buildSongTheme)(this.state.currentTrackId, this.state.songFeatures, base, this.theme.colorEnabled)
            : (0, songTheme_js_1.defaultSongTheme)(base, this.theme.colorEnabled);
    }
    // ── Render ────────────────────────────────────────────────────────────────
    renderFrame() {
        if (!this.running)
            return;
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
        if ((0, layout_js_1.isTooSmall)(cols, rows)) {
            this.renderer.writeCenter(Math.floor(rows / 2), (0, layout_js_1.tooSmallMessage)(cols, rows));
            this.renderer.flush();
            return;
        }
        // ── Constraint layout ──
        //   Frame → [searchR (1), bodyR (fill)]
        //   bodyR → [leftR (50 %), rightR (50 %)]
        //   rightR → [lyricsR (50 %), waveR (50 %)]
        const frame = { x: 0, y: 0, width: cols, height: rows };
        const [searchR, bodyR] = (0, tui_js_1.vSplit)(frame, [tui_js_1.C.length(1), tui_js_1.C.fill()]);
        const [leftR, rightR] = (0, tui_js_1.hSplit)(bodyR, [tui_js_1.C.percent(50), tui_js_1.C.percent(50)]);
        const [lyricsR, waveR] = (0, tui_js_1.vSplit)(rightR, [tui_js_1.C.percent(50), tui_js_1.C.percent(50)]);
        // ── Widget dispatch ──
        (0, searchBar_js_1.renderSearchBar)(this.state, this.renderer, searchR);
        (0, recordDeck_js_1.renderRecordDeck)(this.state, this.renderer, leftR, now);
        (0, lyricsTerminal_js_1.renderLyricsTerminal)(this.state, this.renderer, lyricsR, now);
        (0, wavePanel_js_1.renderWavePanel)(this.state, this.renderer, waveR, now);
        this.renderer.flush();
    }
    // ── Lyrics sync ───────────────────────────────────────────────────────────
    syncLyrics(now) {
        const lines = this.state.lrcLines;
        if (lines.length === 0)
            return;
        const newIdx = (0, lrclib_js_1.activeLyricIndex)(lines, this.state.progressMs);
        if (newIdx !== this.state.activeLyricIdx) {
            this.state.activeLyricIdx = newIdx;
            this.state.lyricRevealedChars = 0;
            this.state.lyricRevealStartMs = now;
        }
    }
    // ── Input ─────────────────────────────────────────────────────────────────
    async handleAction(action) {
        try {
            switch (action) {
                case "quit":
                    await this.stop();
                    process.exit(0);
                    break;
                case "toggle_play":
                    if (this.state.isPlaying)
                        await spotifyDesktop.pause();
                    else
                        await spotifyDesktop.play();
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
                            this.state.mode = "album-art";
                        }
                    }
                    else {
                        this.state.mode = this.state.priorMode;
                    }
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
                case "refresh":
                    await this.pollSpotify();
                    break;
            }
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this.renderer.writeCenter(this.state.rows - 2, `  ERR: ${msg.slice(0, Math.max(1, this.state.cols - 8))}  `);
        }
    }
}
exports.VisualizerEngine = VisualizerEngine;
//# sourceMappingURL=engine.js.map
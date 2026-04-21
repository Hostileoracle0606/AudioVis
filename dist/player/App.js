"use strict";
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
exports.App = void 0;
const renderer_js_1 = require("../ui/renderer.js");
const theme_js_1 = require("./theme.js");
const borders_js_1 = require("../ui/borders.js");
const layout_js_1 = require("./layout.js");
const state_js_1 = require("./state.js");
const AppScreen_js_1 = require("../ui/AppScreen.js");
const input_js_1 = require("../ui/input.js");
const audioFeeder_js_1 = require("./feeders/audioFeeder.js");
const spotifyFeeder_js_1 = require("./feeders/spotifyFeeder.js");
const cpuFeeder_js_1 = require("./feeders/cpuFeeder.js");
const albumArtFeeder_js_1 = require("./feeders/albumArtFeeder.js");
const lyricsFeeder_js_1 = require("./feeders/lyricsFeeder.js");
const spotifyDesktop = __importStar(require("../macos/spotifyDesktop.js"));
const node_perf_hooks_1 = require("node:perf_hooks");
const titleBar_js_1 = require("./widgets/titleBar.js");
const albumArt_js_1 = require("./widgets/albumArt.js");
const nowPlaying_js_1 = require("./widgets/nowPlaying.js");
const queuePads_js_1 = require("./widgets/queuePads.js");
const lyrics_js_1 = require("./widgets/lyrics.js");
const spectrum_js_1 = require("./widgets/spectrum.js");
const controls_js_1 = require("./widgets/controls.js");
const accentArbiter_js_1 = require("./accentArbiter.js");
class App {
    state;
    renderer;
    running = false;
    stopCpu = null;
    stopSpotify = null;
    transportDebounceAt = 0;
    opts;
    constructor(opts) {
        this.opts = opts;
        const { cols, rows } = (0, AppScreen_js_1.getTerminalSize)();
        this.state = (0, state_js_1.createInitialState)(cols, rows);
    }
    async start() {
        this.running = true;
        (0, AppScreen_js_1.enterAlternateScreen)();
        const { cols, rows } = (0, AppScreen_js_1.getTerminalSize)();
        this.renderer = new renderer_js_1.Renderer(cols, rows);
        process.stdout.on("resize", () => {
            const { cols: c, rows: r } = (0, AppScreen_js_1.getTerminalSize)();
            this.state.cols = c;
            this.state.rows = r;
            this.renderer.resize(c, r);
            this.renderer.invalidate();
        });
        await this.opts.audio.start();
        (0, audioFeeder_js_1.startAudioFeeder)(this.opts.audio, this.state);
        this.stopSpotify = (0, spotifyFeeder_js_1.startSpotifyFeeder)(this.state, (title, artist, album, artUrl) => {
            // Reset per-track visuals. Baseline fields live on state now and
            // are re-anchored on every Spotify poll inside the feeder itself.
            this.state.progressEnvelope.fill(0);
            this.state.activePadIndex = 0;
            const L = (0, layout_js_1.computeAppLayout)(this.state.cols, this.state.rows);
            void (0, albumArtFeeder_js_1.fetchAlbumArt)(this.state, artUrl, L.screenR.width - 2, L.screenR.height - 2, this.opts.noColor);
            void (0, lyricsFeeder_js_1.fetchLyricsFor)(this.state, title, artist, album);
        });
        this.stopCpu = (0, cpuFeeder_js_1.startCpuFeeder)(this.state);
        // No search mode anymore — always in hotkey mode.
        (0, input_js_1.startInput)(() => "hotkey", (e) => this.handleInput(e));
        const frameMs = 1000 / 60;
        let last = node_perf_hooks_1.performance.now();
        const tick = () => {
            if (!this.running)
                return;
            const now = node_perf_hooks_1.performance.now();
            if (now - last >= frameMs) {
                last = now;
                this.renderFrame();
            }
            setImmediate(tick);
        };
        setImmediate(tick);
    }
    async stop() {
        if (!this.running)
            return;
        this.running = false;
        (0, input_js_1.stopInput)();
        this.stopCpu?.();
        this.stopSpotify?.();
        await this.opts.audio.stop();
        (0, AppScreen_js_1.exitAlternateScreen)();
    }
    renderFrame() {
        const L = (0, layout_js_1.computeAppLayout)(this.state.cols, this.state.rows);
        this.renderer.clear();
        if (L.tooSmall) {
            const msg = `Terminal too small: ${this.state.cols}x${this.state.rows} (minimum ${layout_js_1.MIN_COLS}x${layout_js_1.MIN_ROWS})`;
            const x = Math.max(0, Math.floor((this.state.cols - msg.length) / 2));
            const y = Math.max(0, Math.floor(this.state.rows / 2));
            this.renderer.write(x, y, msg);
            this.renderer.flushDirty();
            return;
        }
        if (this.state.isPlaying && this.state.progressBaselineAt > 0) {
            const elapsed = Date.now() - this.state.progressBaselineAt;
            this.state.progressMs = Math.min(this.state.durationMs, this.state.progressBaselineMs + elapsed);
        }
        (0, lyricsFeeder_js_1.updateActiveLyric)(this.state);
        const theme = (0, theme_js_1.buildTheme)(this.state.spectrumPaletteIndex, this.opts.noColor);
        const accent = (0, accentArbiter_js_1.resolveAccentTargets)(this.state, Date.now());
        (0, borders_js_1.drawOuterFrame)(this.renderer);
        (0, borders_js_1.drawHSeparator)(this.renderer, L.sep1Y, { down: L.sep1Down, up: [] });
        (0, borders_js_1.drawHSeparator)(this.renderer, L.sep2Y, { down: L.sep2Down, up: L.sep2Up });
        (0, borders_js_1.drawHSeparator)(this.renderer, L.sep3Y, { down: [], up: L.sep3Up });
        (0, borders_js_1.drawVDivider)(this.renderer, L.sep1Down[0], L.topRow.y, L.topRow.y + L.topRow.height - 1);
        (0, borders_js_1.drawVDivider)(this.renderer, L.sep1Down[1], L.topRow.y, L.topRow.y + L.topRow.height - 1);
        (0, borders_js_1.drawVDivider)(this.renderer, L.sep2Down[0], L.middleRow.y, L.middleRow.y + L.middleRow.height - 1);
        (0, titleBar_js_1.renderTitleBar)(this.renderer, L, this.state, theme, accent);
        (0, albumArt_js_1.renderAlbumArt)(this.renderer, L.screenR, this.state, theme);
        (0, nowPlaying_js_1.renderNowPlaying)(this.renderer, L.nowR, this.state, theme);
        (0, queuePads_js_1.renderQueuePads)(this.renderer, L.padsR, this.state, theme);
        (0, lyrics_js_1.renderLyrics)(this.renderer, L.lyricsR, this.state, theme, accent);
        (0, spectrum_js_1.renderSpectrum)(this.renderer, L.spectrumR, this.state, theme, accent);
        (0, controls_js_1.renderControls)(this.renderer, L, this.state, theme);
        this.renderer.flushDirty();
    }
    handleInput(e) {
        if (e.kind === "quit") {
            void this.stop().then(() => process.exit(0));
            return;
        }
        if (e.kind === "play_pad") {
            if (this.state.recentlyPlayed[e.slot])
                this.state.activePadIndex = e.slot;
            return;
        }
        if (e.kind === "hotkey")
            this.handleHotkey(e.action);
    }
    handleHotkey(action) {
        const now = Date.now();
        const transport = action === "toggle_play" || action === "next" || action === "prev" || action === "mute";
        if (transport && now - this.transportDebounceAt < 300)
            return;
        if (transport)
            this.transportDebounceAt = now;
        switch (action) {
            case "quit":
                void this.stop().then(() => process.exit(0));
                return;
            case "toggle_play":
                void (this.state.isPlaying ? spotifyDesktop.pause() : spotifyDesktop.play()).catch(() => { });
                return;
            case "next":
                void spotifyDesktop.nextTrack().catch(() => { });
                return;
            case "prev":
                void spotifyDesktop.previousTrack().catch(() => { });
                return;
            case "mute": {
                void (async () => {
                    try {
                        const { execFile } = await Promise.resolve().then(() => __importStar(require("node:child_process")));
                        const { promisify } = await Promise.resolve().then(() => __importStar(require("node:util")));
                        const run = promisify(execFile);
                        if (!this.state.isMuted) {
                            const { stdout } = await run("/usr/bin/osascript", [
                                "-e", 'tell application "Spotify" to get sound volume'
                            ]);
                            this.state.savedVolume = Math.max(1, parseInt(stdout.trim(), 10) || 50);
                        }
                        const cmd = this.state.isMuted
                            ? `set sound volume to ${this.state.savedVolume}`
                            : `set sound volume to 0`;
                        await run("/usr/bin/osascript", [
                            "-e", `tell application "Spotify" to ${cmd}`,
                        ]);
                        this.state.isMuted = !this.state.isMuted;
                    }
                    catch { }
                })();
                return;
            }
            case "cycle_palette":
                this.state.spectrumPaletteIndex = (this.state.spectrumPaletteIndex + 1) % theme_js_1.PALETTE_COUNT;
                return;
            case "toggle_art": {
                const order = ["art", "vu", "blank"];
                this.state.artCellMode = order[(order.indexOf(this.state.artCellMode) + 1) % order.length];
                return;
            }
            // `focus_search` intentionally no-op now — search has been
            // removed from the UI. The HOTKEYS table still maps "/" to
            // "focus_search" so we ignore it here rather than wiring it up.
        }
    }
}
exports.App = App;
//# sourceMappingURL=App.js.map
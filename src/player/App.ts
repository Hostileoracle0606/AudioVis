import { Renderer } from "../ui/renderer.js";
import { buildTheme, PALETTE_COUNT } from "./theme.js";
import { drawOuterFrame, drawHSeparator, drawVDivider } from "../ui/borders.js";
import { computeAppLayout, MIN_COLS, MIN_ROWS } from "./layout.js";
import { createInitialState, type AppState } from "./state.js";
import { enterAlternateScreen, exitAlternateScreen, getTerminalSize } from "../ui/AppScreen.js";
import { startInput, stopInput, type InputEvent } from "../ui/input.js";
import type { AudioSource } from "../audio/AudioSource.js";
import { startAudioFeeder } from "./feeders/audioFeeder.js";
import { startSpotifyFeeder } from "./feeders/spotifyFeeder.js";
import { startCpuFeeder } from "./feeders/cpuFeeder.js";
import { fetchAlbumArt } from "./feeders/albumArtFeeder.js";
import { fetchLyricsFor, updateActiveLyric } from "./feeders/lyricsFeeder.js";
import * as spotifyDesktop from "../macos/spotifyDesktop.js";
import { searchTracks } from "./search/spotifyWebApi.js";
import { performance } from "node:perf_hooks";

import { renderTitleBar } from "./widgets/titleBar.js";
import { renderAlbumArt } from "./widgets/albumArt.js";
import { renderNowPlaying } from "./widgets/nowPlaying.js";
import { renderRecentlyPlayed } from "./widgets/recentlyPlayed.js";
import { renderLyrics } from "./widgets/lyrics.js";
import { renderSpectrum } from "./widgets/spectrum.js";
import { renderControls } from "./widgets/controls.js";

export interface AppOptions { audio: AudioSource; noColor: boolean; }

export class App {
  private state: AppState;
  private renderer!: Renderer;
  private running = false;
  private stopCpu: (() => void) | null = null;
  private stopSpotify: (() => void) | null = null;
  private searchDebounce: NodeJS.Timeout | null = null;
  private searchAbort: AbortController | null = null;
  private transportDebounceAt = 0;
  private progressBaselineAt = 0;
  private progressBaselineMs = 0;
  private readonly opts: AppOptions;

  constructor(opts: AppOptions) {
    this.opts = opts;
    const { cols, rows } = getTerminalSize();
    this.state = createInitialState(cols, rows);
  }

  async start(): Promise<void> {
    this.running = true;
    enterAlternateScreen();
    const { cols, rows } = getTerminalSize();
    this.renderer = new Renderer(cols, rows);

    process.stdout.on("resize", () => {
      const { cols: c, rows: r } = getTerminalSize();
      this.state.cols = c; this.state.rows = r;
      this.renderer.resize(c, r);
      this.renderer.invalidate();
    });

    await this.opts.audio.start();
    startAudioFeeder(this.opts.audio, this.state);
    this.stopSpotify = startSpotifyFeeder(this.state, (title, artist, album, artUrl) => {
      this.progressBaselineAt = Date.now();
      this.progressBaselineMs = this.state.progressMs;
      const L = computeAppLayout(this.state.cols, this.state.rows);
      void fetchAlbumArt(this.state, artUrl, L.screenR.width - 4, L.screenR.height - 3, this.opts.noColor);
      void fetchLyricsFor(this.state, title, artist, album);
    });
    this.stopCpu = startCpuFeeder(this.state);

    startInput(() => (this.state.search.focused ? "text" : "hotkey"), (e) => this.handleInput(e));

    const frameMs = 1000 / 60;
    let last = performance.now();
    const tick = () => {
      if (!this.running) return;
      const now = performance.now();
      if (now - last >= frameMs) {
        last = now;
        this.renderFrame();
      }
      setImmediate(tick);
    };
    setImmediate(tick);
  }

  async stop(): Promise<void> {
    if (!this.running) return;
    this.running = false;
    stopInput();
    this.stopCpu?.();
    this.stopSpotify?.();
    await this.opts.audio.stop();
    exitAlternateScreen();
  }

  private renderFrame(): void {
    const L = computeAppLayout(this.state.cols, this.state.rows);
    this.renderer.clear();

    if (L.tooSmall) {
      const msg = `Terminal too small: ${this.state.cols}x${this.state.rows} (minimum ${MIN_COLS}x${MIN_ROWS})`;
      const x = Math.max(0, Math.floor((this.state.cols - msg.length) / 2));
      const y = Math.max(0, Math.floor(this.state.rows / 2));
      this.renderer.write(x, y, msg);
      this.renderer.flushDirty();
      return;
    }

    if (this.state.isPlaying && this.progressBaselineAt > 0) {
      const elapsed = Date.now() - this.progressBaselineAt;
      this.state.progressMs = Math.min(
        this.state.durationMs,
        this.progressBaselineMs + elapsed,
      );
    }
    updateActiveLyric(this.state);

    const theme = buildTheme(this.state.spectrumPaletteIndex, this.opts.noColor);

    drawOuterFrame(this.renderer);
    drawHSeparator(this.renderer, L.sep1Y, { down: L.sep1Down, up: [] });
    drawHSeparator(this.renderer, L.sep2Y, { down: L.sep2Down, up: L.sep2Up });
    drawHSeparator(this.renderer, L.sep3Y, { down: [], up: L.sep3Up });
    drawVDivider(this.renderer, L.sep1Down[0], L.topRow.y, L.topRow.y + L.topRow.height - 1);
    drawVDivider(this.renderer, L.sep1Down[1], L.topRow.y, L.topRow.y + L.topRow.height - 1);
    drawVDivider(this.renderer, L.sep2Down[0], L.middleRow.y, L.middleRow.y + L.middleRow.height - 1);

    renderTitleBar(this.renderer, L, this.state, theme);
    renderAlbumArt(this.renderer, L.screenR, this.state, theme);
    renderNowPlaying(this.renderer, L.nowR, this.state, theme);
    renderRecentlyPlayed(this.renderer, L.padsR, this.state, theme);
    renderLyrics(this.renderer, L.lyricsR, this.state, theme);
    renderSpectrum(this.renderer, L.spectrumR, this.state, theme);
    renderControls(this.renderer, L, this.state, theme);

    this.renderer.flushDirty();
  }

  private handleInput(e: InputEvent): void {
    if (e.kind === "quit") { void this.stop().then(() => process.exit(0)); return; }
    if (this.state.search.focused) {
      this.handleTextInput(e);
    } else {
      if (e.kind === "hotkey") this.handleHotkey(e.action);
    }
  }

  private handleHotkey(action: string): void {
    const now = Date.now();
    const transport = action === "toggle_play" || action === "next" || action === "prev" || action === "mute";
    if (transport && now - this.transportDebounceAt < 300) return;
    if (transport) this.transportDebounceAt = now;

    switch (action) {
      case "quit": void this.stop().then(() => process.exit(0)); return;
      case "toggle_play":
        void (this.state.isPlaying ? spotifyDesktop.pause() : spotifyDesktop.play()).catch(() => {});
        return;
      case "next": void spotifyDesktop.nextTrack().catch(() => {}); return;
      case "prev": void spotifyDesktop.previousTrack().catch(() => {}); return;
      case "mute": {
        void (async () => {
          try {
            const { execFile } = await import("node:child_process");
            const { promisify } = await import("node:util");
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
          } catch {}
        })();
        return;
      }
      case "cycle_palette":
        this.state.spectrumPaletteIndex = (this.state.spectrumPaletteIndex + 1) % PALETTE_COUNT;
        return;
      case "toggle_art": {
        const order: AppState["artCellMode"][] = ["art", "vu", "blank"];
        this.state.artCellMode = order[(order.indexOf(this.state.artCellMode) + 1) % order.length];
        return;
      }
      case "focus_search":
        this.state.search.focused = true;
        this.state.search.query = "";
        this.state.search.results = [];
        this.state.search.selectedIndex = 0;
        return;
    }
  }

  private handleTextInput(e: InputEvent): void {
    if (e.kind === "text") {
      this.state.search.query += e.char;
      this.scheduleSearch();
      return;
    }
    if (e.kind === "edit") {
      if (e.op === "backspace") {
        this.state.search.query = this.state.search.query.slice(0, -1);
        this.scheduleSearch();
      } else if (e.op === "enter") {
        const sel = this.state.search.results[this.state.search.selectedIndex];
        if (sel) void spotifyDesktop.playTrack(sel.uri).catch(() => {});
        this.closeSearch();
      } else if (e.op === "escape") {
        this.closeSearch();
      }
      return;
    }
    if (e.kind === "nav") {
      const n = this.state.search.results.length;
      if (n === 0) return;
      if (e.dir === "up") this.state.search.selectedIndex = (this.state.search.selectedIndex - 1 + n) % n;
      if (e.dir === "down") this.state.search.selectedIndex = (this.state.search.selectedIndex + 1) % n;
    }
  }

  private scheduleSearch(): void {
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchAbort?.abort();
    this.searchDebounce = setTimeout(async () => {
      const q = this.state.search.query;
      if (!q.trim()) { this.state.search.results = []; this.state.search.loading = false; return; }
      this.state.search.loading = true;
      this.searchAbort = new AbortController();
      try {
        const res = await searchTracks(q, this.searchAbort.signal);
        this.state.search.results = res;
        this.state.search.selectedIndex = 0;
        this.state.search.error = null;
      } catch (err: any) {
        this.state.search.error = err?.message ?? String(err);
        this.state.search.results = [];
      } finally {
        this.state.search.loading = false;
      }
    }, 180);
  }

  private closeSearch(): void {
    this.state.search.focused = false;
    this.state.search.query = "";
    this.state.search.results = [];
    this.state.search.selectedIndex = 0;
    this.searchAbort?.abort();
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
  }
}

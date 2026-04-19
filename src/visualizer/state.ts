import type { AsciiArt } from "../album/converter.js";
import type { SongFeatures } from "../dsp/songFeatures.js";
import type { SongTheme } from "./songTheme.js";
import { defaultSongTheme } from "./songTheme.js";
import type { LyricLine } from "../lyrics/lrclib.js";

export type VisMode = "player" | "wavefield" | "scroll" | "spectrum" | "album-art";
export type BackgroundMode = "wavefield" | "scroll" | "spectrum";

export interface VisState {
  mode: VisMode;

  // DSP state
  smoothedBuckets: Float32Array;
  rawBuckets: Float32Array;
  low: number;
  mid: number;
  high: number;
  amplitude: number;
  pulse: number;

  // Spotify metadata
  trackName: string;
  artistName: string;
  albumName: string;
  deviceName: string;
  isPlaying: boolean;
  progressMs: number;
  durationMs: number;

  // Album art
  albumArt: AsciiArt | null;
  albumArtUrl: string;
  priorMode: VisMode;

  // Terminal dimensions
  cols: number;
  rows: number;

  // Time (for animation phases)
  startTime: number;

  // Number of visual buckets / bars
  numBars: number;

  // Ring buffer for scroll mode
  scrollHistory: Float32Array;

  // Visual-effect state (shared across modes)
  peakHold: Float32Array;      // per-bar decaying peak for spectrum caps
  lastPulseMs: number;         // wall-clock time of the most recent beat onset
  lastPulseStrength: number;   // 0..1 — strength of that onset, for effect intensity

  // Ring queue: up to N recent beat timestamps so wavefield can render
  // multiple overlapping ripples instead of just the latest.
  ringQueue: { ms: number; strength: number }[];

  // Particles — scroll-mode dots with physics.  Spawned on beats & peaks.
  particles: Particle[];

  // Song-level features + theme
  songFeatures: SongFeatures;
  songTheme: SongTheme;
  currentTrackId: string;      // last trackId we generated a theme for

  // Player-mode specific
  backgroundMode: BackgroundMode;  // which legacy mode runs as dim plate
  searchQuery: string;
  searchFocused: boolean;
  platterPhase: number;            // 0..1, wraps at 33⅓ rpm (scaled)
  grillePulseRow: number;          // -1 = no flash; else row idx inside grille
  grillePulseUntilMs: number;      // wall clock — after this, flash ends
  lyricsLines: string[];           // legacy metadata marquee (kept for compat)
  lyricsCycleMs: number;
  lyricsIdx: number;
  sideWavePhase: number;

  // LRC lyrics (synced)
  lrcLines: LyricLine[];
  activeLyricIdx: number;
  lyricRevealedChars: number;      // typewriter: chars shown so far on active line
  lyricRevealStartMs: number;      // wall-clock when current line started revealing
  lyricFetchKey: string;           // "trackName:::artistName" last fetched
  lyricFetchState: "idle" | "fetching" | "ready" | "none";

  // Cava bar data (optional — falls back to smoothedBuckets)
  cavaBars: Float32Array;
  cavaActive: boolean;             // true once cava is streaming frames
}

export interface Particle {
  x: number;            // terminal column (float, sub-cell precision)
  y: number;            // terminal row (float)
  vx: number;           // cells per second
  vy: number;           // cells per second (negative = upward)
  life: number;         // 0..1 — remaining lifetime
  lifeDecay: number;    // how fast life decays per second
  glyph: string;        // which char to render
}

export function createInitialState(
  mode: VisMode,
  numBars: number,
  cols: number,
  rows: number
): VisState {
  return {
    mode,
    smoothedBuckets: new Float32Array(numBars),
    rawBuckets: new Float32Array(numBars),
    low: 0,
    mid: 0,
    high: 0,
    amplitude: 0,
    pulse: 0,

    trackName: "",
    artistName: "",
    albumName: "",
    deviceName: "",
    isPlaying: false,
    progressMs: 0,
    durationMs: 0,

    albumArt: null,
    albumArtUrl: "",
    priorMode: mode,

    cols,
    rows,
    startTime: Date.now(),
    numBars,
    scrollHistory: new Float32Array(cols),

    peakHold: new Float32Array(numBars),
    lastPulseMs: 0,
    lastPulseStrength: 0,

    ringQueue: [],
    particles: [],

    songFeatures: {
      bpm: 0, tempoPhase: 0, brightness: 0, warmth: 0,
      dynamics: 0, density: 0, confidence: 0,
    },
    songTheme: defaultSongTheme(
      { dim: "", normal: "", bright: "", reset: "\x1b[0m" },
      true
    ),
    currentTrackId: "",

    backgroundMode: "wavefield",
    searchQuery: "",
    searchFocused: false,
    platterPhase: 0,
    grillePulseRow: -1,
    grillePulseUntilMs: 0,
    lyricsLines: [],
    lyricsCycleMs: 0,
    lyricsIdx: 0,
    sideWavePhase: 0,

    lrcLines: [],
    activeLyricIdx: 0,
    lyricRevealedChars: 0,
    lyricRevealStartMs: 0,
    lyricFetchKey: "",
    lyricFetchState: "idle",

    cavaBars: new Float32Array(numBars),
    cavaActive: false,
  };
}

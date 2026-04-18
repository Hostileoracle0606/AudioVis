import type {
  AnalysisFrame as MotionFrame,
  StyleProfile,
} from "../spotify/styleProfile.js";

export const VIS_MODE_IDS = [
  "wavefield",
  "scroll",
  "spectrum",
  "skyline",
  "fire",
  "tunnel",
] as const;

export type VisMode = typeof VIS_MODE_IDS[number];

export interface VisState {
  mode: VisMode;

  // Analyzer state
  smoothedBuckets: Float32Array;
  rawBuckets: Float32Array;
  low: number;
  mid: number;
  high: number;
  amplitude: number;
  pulse: number;

  // Local player metadata
  trackName: string;
  artistName: string;
  albumName: string;
  appName: string;
  isPlaying: boolean;
  progressMs: number;
  durationMs: number;
  statusMessage: string;

  // Signal-derived motion/theme state
  analysisFrame: MotionFrame;
  styleProfile: StyleProfile;

  // Pitch-to-palette
  pitchHue: number;
  targetPitchHue: number;
  pitchSaturation: number;

  // Terminal dimensions
  cols: number;
  rows: number;

  // Time (for animation phases)
  startTime: number;

  // Number of visual buckets / bars
  numBars: number;

  // Mode-local caches and buffers
  modeData: Record<string, unknown>;
}

export function createInitialState(
  mode: VisMode,
  numBars: number,
  cols: number,
  rows: number
): VisState {
  const initialStyle: StyleProfile = {
    label: "steady glow",
    confidence: 0,
    glitch: 0.2,
    neon: 0.35,
    organic: 0.3,
    metallic: 0.15,
    softness: 0.4,
    aggression: 0.2,
    density: 0.25,
    groove: 0.3,
    darkness: 0.25,
    dominantPitchClass: 4,
    dominantPitchLabel: "E",
    hue: 120,
    saturation: 0.45,
    brightness: 0.4,
    genreHints: [],
  };

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
    appName: "Spotify",
    isPlaying: false,
    progressMs: 0,
    durationMs: 0,
    statusMessage: "",

    analysisFrame: {
      segment: null,
      tatumProgress: 0,
      beatProgress: 0,
      sectionProgress: 0,
      sectionTransition: 0,
    },
    styleProfile: initialStyle,

    pitchHue: initialStyle.hue,
    targetPitchHue: initialStyle.hue,
    pitchSaturation: initialStyle.saturation,

    cols,
    rows,
    startTime: Date.now(),
    numBars,
    modeData: {},
  };
}

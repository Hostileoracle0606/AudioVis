import type { AsciiArt } from "../album/converter.js";
import type { SpotifyAudioAnalysis } from "../spotify/types.js";
import type { AnalysisFrame, StyleProfile } from "../spotify/styleProfile.js";

export type VisMode = "wavefield" | "scroll" | "spectrum" | "album-art";

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
  trackId: string;
  artistName: string;
  albumName: string;
  deviceName: string;
  isPlaying: boolean;
  progressMs: number;
  durationMs: number;
  spotifyStatus: string;
  currentSegmentIndex: number;
  currentBeatIndex: number;
  currentTatumIndex: number;
  currentSectionIndex: number;
  analysis: SpotifyAudioAnalysis | null;
  analysisFrame: AnalysisFrame;
  styleProfile: StyleProfile;

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
}

export function createInitialState(
  mode: VisMode,
  numBars: number,
  cols: number,
  rows: number
): VisState {
  const initialStyle: StyleProfile = {
    label: "shape-shifting pulse",
    confidence: 0,
    glitch: 0.25,
    neon: 0.4,
    organic: 0.25,
    metallic: 0.2,
    softness: 0.35,
    aggression: 0.3,
    density: 0.4,
    groove: 0.35,
    darkness: 0.3,
    dominantPitchClass: 9,
    dominantPitchLabel: "A",
    hue: 300,
    saturation: 0.55,
    brightness: 0.55,
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
    trackId: "",
    artistName: "",
    albumName: "",
    deviceName: "",
    isPlaying: false,
    progressMs: 0,
    durationMs: 0,
    spotifyStatus: "",
    currentSegmentIndex: 0,
    currentBeatIndex: 0,
    currentTatumIndex: 0,
    currentSectionIndex: 0,
    analysis: null,
    analysisFrame: {
      segment: null,
      tatumProgress: 0,
      beatProgress: 0,
      sectionProgress: 0,
      sectionTransition: 0,
    },
    styleProfile: initialStyle,

    albumArt: null,
    albumArtUrl: "",
    priorMode: mode,

    cols,
    rows,
    startTime: Date.now(),
    numBars,
    scrollHistory: new Float32Array(cols),
  };
}

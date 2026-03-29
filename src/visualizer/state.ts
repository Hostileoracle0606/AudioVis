export type VisMode = "wavefield" | "scroll" | "spectrum";

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
  deviceName: string;
  isPlaying: boolean;
  progressMs: number;
  durationMs: number;

  // Terminal dimensions
  cols: number;
  rows: number;

  // Time (for animation phases)
  startTime: number;  // Date.now() at engine start

  // Number of visual buckets / bars
  numBars: number;

  // Ring buffer for scroll mode — one amplitude value per visible column
  scrollHistory: Float32Array;
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
    deviceName: "",
    isPlaying: false,
    progressMs: 0,
    durationMs: 0,

    cols,
    rows,
    startTime: Date.now(),
    numBars,
    scrollHistory: new Float32Array(cols),
  };
}

import type { DesktopState } from "../macos/spotifyDesktop.js";
import type { AsciiArt } from "../album/converter.js";

export interface LrcLine { timeMs: number; text: string; }

export type ArtCellMode = "art" | "vu" | "blank";

export interface AppState {
  cols: number;
  rows: number;

  spectrum: Float32Array;
  meterL: number;
  meterR: number;
  rms: number;
  transientPeak: boolean;
  transientEnergy: number;

  nowPlaying: DesktopState | null;
  recentlyPlayed: DesktopState[];
  isPlaying: boolean;
  progressMs: number;
  durationMs: number;
  lastSpotifyPollAt: number;

  lyrics: LrcLine[];
  activeLyricIndex: number;

  albumArt: AsciiArt | null;

  cpuPct: number;

  spectrumPaletteIndex: number;
  artCellMode: ArtCellMode;
  isMuted: boolean;
  savedVolume: number;

  // Extrapolation baseline for progressMs — re-anchored on every
  // Spotify poll so pauses/seeks don't let the render-loop clock drift
  // away from reality. `progressBaselineAt` is a wall-clock timestamp
  // (ms since epoch); `progressBaselineMs` is the track-position that
  // was true at that wall-clock time.
  progressBaselineAt: number;
  progressBaselineMs: number;

  lastTransientAt: number;
  lastClipAt: number;
  lastPeakAt: number;
  progressEnvelope: Float32Array;
  ledChaserIndex: number;
  activePadIndex: number;
  padFingerprints: Uint8Array[];

  quit: boolean;
}

export function createInitialState(cols: number, rows: number): AppState {
  return {
    cols, rows,
    spectrum: new Float32Array(16),
    meterL: 0, meterR: 0, rms: 0,
    transientPeak: false, transientEnergy: 0,
    nowPlaying: null,
    recentlyPlayed: [],
    isPlaying: false,
    progressMs: 0, durationMs: 0, lastSpotifyPollAt: 0,
    lyrics: [], activeLyricIndex: -1,
    albumArt: null,
    cpuPct: 0,
    spectrumPaletteIndex: 0,
    artCellMode: "art",
    isMuted: false, savedVolume: 50,
    progressBaselineAt: 0, progressBaselineMs: 0,
    lastTransientAt: 0, lastClipAt: 0, lastPeakAt: 0,
    progressEnvelope: new Float32Array(128),
    ledChaserIndex: 0,
    activePadIndex: 0,
    padFingerprints: Array.from({ length: 8 }, () => new Uint8Array(16)),
    quit: false,
  };
}

/**
 * Push a Spotify state onto the recently-played ring.
 * Dedups when head has the same trackName+artistName. Caps length at 8.
 */
export function pushRecentlyPlayed(state: AppState, entry: DesktopState): void {
  const head = state.recentlyPlayed[0];
  if (head && head.trackName === entry.trackName && head.artistName === entry.artistName) {
    return;
  }
  state.recentlyPlayed = [entry, ...state.recentlyPlayed].slice(0, 8);
}

import type { DesktopState } from "../macos/spotifyDesktop.js";
import type { AsciiArt } from "../album/converter.js";
export interface LrcLine {
    timeMs: number;
    text: string;
}
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
export declare function createInitialState(cols: number, rows: number): AppState;
/**
 * Push a Spotify state onto the recently-played ring.
 * Dedups when head has the same trackName+artistName. Caps length at 8.
 */
export declare function pushRecentlyPlayed(state: AppState, entry: DesktopState): void;
//# sourceMappingURL=state.d.ts.map
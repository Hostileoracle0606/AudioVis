import type { AnalysisFrame as MotionFrame, StyleProfile } from "../spotify/styleProfile.js";
export declare const VIS_MODE_IDS: readonly ["wavefield", "scroll", "spectrum", "skyline", "fire", "tunnel", "topographic"];
export type VisMode = typeof VIS_MODE_IDS[number];
export interface VisState {
    mode: VisMode;
    smoothedBuckets: Float32Array;
    rawBuckets: Float32Array;
    low: number;
    mid: number;
    high: number;
    amplitude: number;
    pulse: number;
    trackName: string;
    artistName: string;
    albumName: string;
    appName: string;
    isPlaying: boolean;
    progressMs: number;
    durationMs: number;
    statusMessage: string;
    analysisFrame: MotionFrame;
    styleProfile: StyleProfile;
    pitchHue: number;
    targetPitchHue: number;
    pitchSaturation: number;
    cols: number;
    rows: number;
    startTime: number;
    numBars: number;
    modeData: Record<string, unknown>;
}
export declare function createInitialState(mode: VisMode, numBars: number, cols: number, rows: number): VisState;
//# sourceMappingURL=state.d.ts.map
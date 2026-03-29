export type VisMode = "wavefield" | "scroll" | "spectrum";
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
    deviceName: string;
    isPlaying: boolean;
    progressMs: number;
    durationMs: number;
    cols: number;
    rows: number;
    startTime: number;
    numBars: number;
    scrollHistory: Float32Array;
}
export declare function createInitialState(mode: VisMode, numBars: number, cols: number, rows: number): VisState;
//# sourceMappingURL=state.d.ts.map
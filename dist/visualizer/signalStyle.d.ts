import type { AnalysisFrame as MotionFrame, StyleProfile } from "../spotify/styleProfile.js";
export declare function derivePitchFromBars(bars: Float32Array): {
    hue: number;
    saturation: number;
} | null;
export declare function deriveMotionFrame(nowMs: number, pulse: number, isPlaying: boolean): MotionFrame;
export declare function deriveSignalStyle(args: {
    low: number;
    mid: number;
    high: number;
    amplitude: number;
    pulse: number;
    hue: number;
    saturation: number;
}): StyleProfile;
//# sourceMappingURL=signalStyle.d.ts.map
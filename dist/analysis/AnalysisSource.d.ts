export interface AnalysisFrame {
    bars: Float32Array;
    low: number;
    mid: number;
    high: number;
    amplitude: number;
    pulse: number;
}
export interface AnalysisSourceInfo {
    source: string;
    bars: number;
    fps: number;
    backend: string;
}
export interface AnalysisSource {
    start(): Promise<void>;
    stop(): Promise<void>;
    onFrame(cb: (frame: AnalysisFrame) => void): void;
    getInfo(): AnalysisSourceInfo;
}
//# sourceMappingURL=AnalysisSource.d.ts.map
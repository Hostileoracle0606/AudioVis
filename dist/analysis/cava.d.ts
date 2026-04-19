import type { AppConfig } from "../config/store.js";
import type { AnalysisFrame, AnalysisSource, AnalysisSourceInfo } from "./AnalysisSource.js";
export interface CavaAvailability {
    available: boolean;
    path?: string;
    message?: string;
}
export interface CavaOptions {
    bars: number;
    fps: number;
    sourceName: string;
    binaryPath?: string;
}
export declare function decodeCava8BitFrame(frame: Buffer, barCount: number): Float32Array;
export declare function deriveLevelsFromBars(bars: Float32Array, previousAmplitude?: number): Omit<AnalysisFrame, "bars">;
export declare function buildCavaConfig(options: CavaOptions): string;
export declare function resolveCavaBinary(config?: AppConfig): string | null;
export declare function getCavaAvailability(config?: AppConfig): CavaAvailability;
export declare class CavaAnalysisSource implements AnalysisSource {
    private readonly options;
    private readonly binaryPath;
    private readonly listeners;
    private proc;
    private buffer;
    private previousAmplitude;
    private tempDir;
    constructor(options: CavaOptions);
    getInfo(): AnalysisSourceInfo;
    onFrame(cb: (frame: AnalysisFrame) => void): void;
    start(): Promise<void>;
    stop(): Promise<void>;
}
//# sourceMappingURL=cava.d.ts.map
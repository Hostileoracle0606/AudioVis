import type { AppConfig } from "../config/store.js";
import type { AnalysisSource } from "./AnalysisSource.js";
export interface CreateAnalysisSourceOptions {
    bars: number;
    fps: number;
    sourceName?: string;
    silent?: boolean;
    binaryPath?: string;
}
export declare function createAnalysisSource(config: AppConfig, options: CreateAnalysisSourceOptions): AnalysisSource;
//# sourceMappingURL=factory.d.ts.map
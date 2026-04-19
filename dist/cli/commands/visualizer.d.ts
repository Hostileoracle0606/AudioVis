import type { Command } from "commander";
interface VisOpts {
    mode: string;
    bars: string;
    fps: string;
    audioDevice?: string;
    sampleRate: string;
    fftSize: string;
    asciiSafe: boolean;
    noColor: boolean;
    silent: boolean;
}
export declare function runVisualizer(opts: VisOpts): Promise<void>;
export declare function registerVisualizer(program: Command): void;
export {};
//# sourceMappingURL=visualizer.d.ts.map
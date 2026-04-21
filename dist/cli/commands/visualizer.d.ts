import type { Command } from "commander";
interface VisOpts {
    audioDevice?: string;
    sampleRate: string;
    fftSize: string;
    noColor: boolean;
    silent: boolean;
}
export declare function runVisualizer(opts: VisOpts): Promise<void>;
export declare function registerVisualizer(program: Command): void;
export {};
//# sourceMappingURL=visualizer.d.ts.map
import type { AudioSource } from "../audio/AudioSource.js";
export interface AppOptions {
    audio: AudioSource;
    noColor: boolean;
}
export declare class App {
    private state;
    private renderer;
    private running;
    private stopCpu;
    private stopSpotify;
    private transportDebounceAt;
    private readonly opts;
    constructor(opts: AppOptions);
    start(): Promise<void>;
    stop(): Promise<void>;
    private renderFrame;
    private handleInput;
    private handleHotkey;
}
//# sourceMappingURL=App.d.ts.map
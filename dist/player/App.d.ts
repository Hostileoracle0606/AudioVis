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
    private searchDebounce;
    private searchAbort;
    private transportDebounceAt;
    private progressBaselineAt;
    private progressBaselineMs;
    private readonly opts;
    constructor(opts: AppOptions);
    start(): Promise<void>;
    stop(): Promise<void>;
    private renderFrame;
    private handleInput;
    private handleHotkey;
    private handleTextInput;
    private scheduleSearch;
    private closeSearch;
}
//# sourceMappingURL=App.d.ts.map
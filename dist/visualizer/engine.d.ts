/**
 * Visualizer engine.
 *
 * Coordinates:
 *   - Audio frame intake → DSP pipeline
 *   - Spotify metadata polling (1 Hz)
 *   - Render loop (target 30 FPS)
 *   - Keyboard input actions
 */
import type { AudioSource } from "../audio/AudioSource.js";
import type { VisMode } from "./state.js";
export interface EngineOptions {
    mode: VisMode;
    numBars: number;
    fps: number;
    sampleRate: number;
    asciiSafe: boolean;
    noColor: boolean;
}
export declare class VisualizerEngine {
    private audio;
    private opts;
    private state;
    private renderer;
    private theme;
    private peak;
    private running;
    private renderTimer;
    private spotifyTimer;
    private lastFrameMs;
    constructor(audio: AudioSource, opts: EngineOptions);
    start(): Promise<void>;
    stop(): Promise<void>;
    private processAudioFrame;
    private pollSpotify;
    private renderFrame;
    private handleAction;
}
//# sourceMappingURL=engine.d.ts.map
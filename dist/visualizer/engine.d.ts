/**
 * Visualizer engine.
 *
 * Coordinates:
 *   - Analyzer frame intake → visual state
 *   - Desktop player metadata polling
 *   - Render loop
 *   - Keyboard transport controls
 */
import type { AnalysisSource } from "../analysis/AnalysisSource.js";
import type { VisMode } from "./state.js";
import type { PlayerBackend } from "../player/types.js";
export interface EngineOptions {
    mode: VisMode;
    numBars: number;
    fps: number;
    asciiSafe: boolean;
    noColor: boolean;
}
export declare class VisualizerEngine {
    private static readonly PLAYING_POLL_MS;
    private static readonly IDLE_POLL_MS;
    private readonly player;
    private readonly analysis;
    private readonly opts;
    private state;
    private renderer;
    private theme;
    private running;
    private renderTimer;
    private playerTimer;
    private playerPollInFlight;
    private lastFrameMs;
    constructor(player: PlayerBackend, analysis: AnalysisSource, opts: EngineOptions);
    start(): Promise<void>;
    stop(): Promise<void>;
    private processAnalysisFrame;
    private pollPlayer;
    private schedulePlayerPoll;
    private nextPlayerPollDelay;
    private runPlayerPollLoop;
    private requestImmediatePlayerPoll;
    private renderFrame;
    private handleAction;
}
//# sourceMappingURL=engine.d.ts.map
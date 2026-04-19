/**
 * VisualizerEngine — Ratatui-pattern architecture.
 *
 * Responsibilities:
 *   - Coordinate background services: AudioSource, CavaStream, LyricsService
 *   - Maintain a single VisState (mutated only by service handlers + render tick)
 *   - Run the render loop: compute constraint layout → dispatch pure widget functions
 *   - Handle keyboard input
 *
 * Layout (computed each frame via tui.ts):
 *
 *   ┌── search bar (1 row, full width) ────────────────────────┐
 *   ├─────────────────────┬────────────────────────────────────┤
 *   │  Record Deck (50 %) │  Lyrics Terminal (50 % × 50 %)     │
 *   │  ─ now playing      ├────────────────────────────────────┤
 *   │  ─ platter          │  Wave Panel     (50 % × 50 %)      │
 *   │  ─ progress│grille  │                                    │
 *   │  ─ album art        │                                    │
 *   └─────────────────────┴────────────────────────────────────┘
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
    private cava;
    private songTracker;
    private themeRefreshCounter;
    constructor(audio: AudioSource, opts: EngineOptions);
    start(): Promise<void>;
    stop(): Promise<void>;
    private startCava;
    private processAudioFrame;
    private pollSpotify;
    private fetchLyricsForTrack;
    private rebuildSongTheme;
    private renderFrame;
    private syncLyrics;
    private handleAction;
}
//# sourceMappingURL=engine.d.ts.map
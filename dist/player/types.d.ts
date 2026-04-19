export interface PlayerState {
    trackName: string;
    artistName: string;
    albumName: string;
    durationMs: number;
    progressMs: number;
    isPlaying: boolean;
    appName: string;
}
export interface BackendAvailability {
    available: boolean;
    message?: string;
}
export interface BackendCapabilities {
    currentTrack: boolean;
    transport: boolean;
    volume: boolean;
}
export interface PlayerBackend {
    getState(): Promise<PlayerState | null>;
    play(): Promise<void>;
    pause(): Promise<void>;
    next(): Promise<void>;
    previous(): Promise<void>;
    setVolume(percent: number): Promise<void>;
    isAvailable(): Promise<BackendAvailability>;
    capabilities(): BackendCapabilities;
}
//# sourceMappingURL=types.d.ts.map
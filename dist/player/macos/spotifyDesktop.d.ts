import type { BackendAvailability, BackendCapabilities, PlayerBackend, PlayerState } from "../types.js";
export type ParsedSpotifyDesktopState = {
    status: "ok";
    state: PlayerState;
} | {
    status: "not_running" | "not_playing";
} | {
    status: "error";
    message: string;
};
export declare function parseSpotifyDesktopStateOutput(output: string): ParsedSpotifyDesktopState;
export declare function isSpotifyDesktopInstalled(): boolean;
export declare class SpotifyDesktopBackend implements PlayerBackend {
    getState(): Promise<PlayerState | null>;
    play(): Promise<void>;
    pause(): Promise<void>;
    next(): Promise<void>;
    previous(): Promise<void>;
    setVolume(percent: number): Promise<void>;
    isAvailable(): Promise<BackendAvailability>;
    capabilities(): BackendCapabilities;
}
//# sourceMappingURL=spotifyDesktop.d.ts.map
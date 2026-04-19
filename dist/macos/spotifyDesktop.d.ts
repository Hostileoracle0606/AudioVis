export interface DesktopState {
    trackName: string;
    artistName: string;
    albumName: string;
    albumArtUrl: string;
    deviceName: string;
    isPlaying: boolean;
    progressMs: number;
    durationMs: number;
}
export declare function getState(): Promise<DesktopState | null>;
export declare function play(): Promise<void>;
export declare function pause(): Promise<void>;
export declare function nextTrack(): Promise<void>;
export declare function previousTrack(): Promise<void>;
//# sourceMappingURL=spotifyDesktop.d.ts.map
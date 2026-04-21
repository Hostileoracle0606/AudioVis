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
/**
 * Play a Spotify track by URI. The URI must be of the form
 * `spotify:track:<id>` — this is what `/v1/search` returns and what
 * Spotify's AppleScript dictionary's `play track` verb accepts.
 */
export declare function playTrack(uri: string): Promise<void>;
//# sourceMappingURL=spotifyDesktop.d.ts.map
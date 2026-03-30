import type { SpotifyArtist, SpotifyAudioAnalysis, SpotifyAudioFeatures, SpotifyDevice, SpotifyPlaybackState } from "./types.js";
export declare function getAccessToken(): Promise<string>;
export declare function getCurrentPlayback(): Promise<SpotifyPlaybackState | null>;
export declare function getAudioAnalysis(trackId: string): Promise<SpotifyAudioAnalysis | null>;
export declare function getAudioFeatures(trackId: string): Promise<SpotifyAudioFeatures | null>;
export declare function getArtists(artistIds: string[]): Promise<SpotifyArtist[]>;
export declare function getDevices(): Promise<SpotifyDevice[]>;
export declare function play(deviceId?: string): Promise<void>;
export declare function pause(deviceId?: string): Promise<void>;
export declare function nextTrack(deviceId?: string): Promise<void>;
export declare function previousTrack(deviceId?: string): Promise<void>;
export declare function setVolume(percent: number, deviceId?: string): Promise<void>;
export declare function transferPlayback(deviceId: string, startPlaying?: boolean): Promise<void>;
//# sourceMappingURL=client.d.ts.map
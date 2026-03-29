import type { SpotifyDevice, SpotifyPlaybackState } from "./types.js";
export declare function getAccessToken(): Promise<string>;
export declare function getCurrentPlayback(): Promise<SpotifyPlaybackState | null>;
export declare function getDevices(): Promise<SpotifyDevice[]>;
export declare function play(deviceId?: string): Promise<void>;
export declare function pause(deviceId?: string): Promise<void>;
export declare function nextTrack(deviceId?: string): Promise<void>;
export declare function previousTrack(deviceId?: string): Promise<void>;
export declare function setVolume(percent: number, deviceId?: string): Promise<void>;
export declare function transferPlayback(deviceId: string, startPlaying?: boolean): Promise<void>;
//# sourceMappingURL=client.d.ts.map
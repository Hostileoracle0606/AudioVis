import type { AppState } from "../state.js";
type TrackChangedCallback = (trackName: string, artistName: string, albumName: string, albumArtUrl: string) => void;
export declare function startSpotifyFeeder(state: AppState, onTrackChanged: TrackChangedCallback): () => void;
export {};
//# sourceMappingURL=spotifyFeeder.d.ts.map
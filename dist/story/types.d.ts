import type { StyleProfile } from "../spotify/styleProfile.js";
import type { SpotifyArtist, SpotifyAudioAnalysis, SpotifyAudioFeatures, SpotifyPlaybackState } from "../spotify/types.js";
export interface StoryViewport {
    width: number;
    height: number;
}
export interface LyricLine {
    startTimeMs: number;
    words: string;
}
export interface StoryLyricSummary {
    mood: string;
    arc: string;
    keywords: string[];
    chorusAnchors: string[];
}
export interface StoryBeat {
    startMs: number;
    endMs: number;
    label: string;
    imagery: string[];
}
export interface StoryScenePlan {
    startMs: number;
    endMs: number;
    title: string;
    mood: string;
    imagery: string[];
    direction: string;
}
export interface StoryScene {
    [key: string]: any;
    startMs: number;
    endMs: number;
    title: string;
    mood: string;
    ascii: string[];
}
export interface Storyboard {
    [key: string]: any;
    trackId: string;
    summary: string;
    beats: StoryBeat[];
    scenes: StoryScene[];
    viewport: StoryViewport;
    promptFingerprint: string;
}
export interface StoryRenderState {
    status: "idle" | "loading" | "ready" | "error";
    error: string;
    context: StoryContext | null;
    storyboard: Storyboard | null;
    sceneIndex: number;
    promptFingerprint: string;
}
export interface StoryContext {
    [key: string]: any;
    trackId: string;
    title: string;
    artist: string;
    album: string;
    durationMs: number;
    progressMs: number;
    isPlaying: boolean;
    playback: SpotifyPlaybackState;
    lyricsAvailable: boolean;
    lyrics: LyricLine[];
    lyricSummary: StoryLyricSummary;
    lyricSummaryText: string;
    artists: SpotifyArtist[];
    genreHints: string[];
    audioFeatures: SpotifyAudioFeatures | null;
    audioAnalysis: SpotifyAudioAnalysis | null;
    styleProfile: StyleProfile;
}
export interface StoryContextBuildResult {
    context: StoryContext | null;
    warnings: string[];
}
export interface StoryPlan {
    summary: string;
    beats: StoryBeat[];
    scenes: StoryScenePlan[];
}
export interface StoryGenerationRequest {
    context: StoryContext;
    width: number;
    height: number;
    asciiSafe: boolean;
    maxScenes: number;
    promptFingerprint: string;
}
//# sourceMappingURL=types.d.ts.map
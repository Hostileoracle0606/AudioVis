import type { SpotifyArtist, SpotifyAudioAnalysis, SpotifyAudioFeatures, SpotifySegment } from "./types.js";
export interface StyleProfile {
    label: string;
    confidence: number;
    glitch: number;
    neon: number;
    organic: number;
    metallic: number;
    softness: number;
    aggression: number;
    density: number;
    groove: number;
    darkness: number;
    dominantPitchClass: number;
    dominantPitchLabel: string;
    hue: number;
    saturation: number;
    brightness: number;
    genreHints: string[];
}
export interface AnalysisFrame {
    segment: SpotifySegment | null;
    tatumProgress: number;
    beatProgress: number;
    sectionProgress: number;
    sectionTransition: number;
}
export declare function inferStyleProfile(args: {
    artists: SpotifyArtist[];
    features: SpotifyAudioFeatures | null;
    analysis: SpotifyAudioAnalysis | null;
}): StyleProfile;
export declare function smoothStyleProfile(current: StyleProfile, next: StyleProfile, amount?: number): StyleProfile;
export declare function buildAnalysisFrame(args: {
    analysis: SpotifyAudioAnalysis | null;
    progressMs: number;
    currentSegmentIndex: number;
    currentBeatIndex: number;
    currentTatumIndex: number;
    currentSectionIndex: number;
}): AnalysisFrame;
//# sourceMappingURL=styleProfile.d.ts.map
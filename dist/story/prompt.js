"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPromptFingerprint = buildPromptFingerprint;
exports.buildStoryboardPlanPrompt = buildStoryboardPlanPrompt;
exports.buildAsciiScenePrompt = buildAsciiScenePrompt;
const crypto_1 = require("crypto");
const PROMPT_VERSION = "story-v1";
function jsonString(value) {
    return JSON.stringify(value, null, 2);
}
function approvedCharset(asciiSafe) {
    return asciiSafe
        ? "space . , : ; ' \" ` - _ / \\ | ( ) [ ] { } + * # % @ = < >"
        : "space plus ASCII punctuation plus lightweight box/block chars like │ ─ ┌ ┐ └ ┘ ╱ ╲ ░ ▒ ▓ █";
}
function buildPromptFingerprint(context, args) {
    const payload = {
        version: PROMPT_VERSION,
        trackId: context.trackId,
        title: context.title,
        artist: context.artist,
        album: context.album,
        lyricSummary: context.lyricSummaryText,
        genreHints: context.genreHints,
        styleLabel: context.styleProfile.label,
        width: args.width,
        height: args.height,
        asciiSafe: args.asciiSafe,
        maxScenes: args.maxScenes,
        modelName: args.modelName,
    };
    return (0, crypto_1.createHash)("sha1").update(JSON.stringify(payload)).digest("hex").slice(0, 16);
}
function buildStoryboardPlanPrompt(request) {
    const { context, maxScenes, width, height, asciiSafe } = request;
    return [
        "You are generating a structured visual story plan for a terminal ASCII music visualizer.",
        "Return JSON only. No markdown, no code fences, no commentary.",
        "",
        "Constraints:",
        `- Create between 1 and ${maxScenes} scenes`,
        "- Each scene must have: startMs, endMs, title, mood, imagery, direction",
        "- Each beat must have: startMs, endMs, label, imagery",
        "- Scene timing must cover the song from start to finish without overlap",
        "- Keep titles and moods concise",
        `- Target display size later will be ${width} columns x ${height} rows`,
        `- Approved character family for the final ASCII step: ${approvedCharset(asciiSafe)}`,
        "",
        "Track context:",
        jsonString({
            trackId: context.trackId,
            title: context.title,
            artist: context.artist,
            album: context.album,
            durationMs: context.durationMs,
            lyricsAvailable: context.lyricsAvailable,
            lyricSummary: context.lyricSummary,
            genreHints: context.genreHints,
            styleProfile: {
                label: context.styleProfile.label,
                hue: context.styleProfile.hue,
                saturation: context.styleProfile.saturation,
                brightness: context.styleProfile.brightness,
                glitch: context.styleProfile.glitch,
                organic: context.styleProfile.organic,
                aggression: context.styleProfile.aggression,
                darkness: context.styleProfile.darkness,
                groove: context.styleProfile.groove,
            },
            audioFeatures: context.audioFeatures ? {
                energy: context.audioFeatures.energy,
                danceability: context.audioFeatures.danceability,
                valence: context.audioFeatures.valence,
                acousticness: context.audioFeatures.acousticness,
                instrumentalness: context.audioFeatures.instrumentalness,
                tempo: context.audioFeatures.tempo,
                key: context.audioFeatures.key,
                mode: context.audioFeatures.mode,
            } : null,
            audioAnalysis: context.audioAnalysis ? {
                duration: context.audioAnalysis.track.duration,
                tempo: context.audioAnalysis.track.tempo,
                key: context.audioAnalysis.track.key,
                mode: context.audioAnalysis.track.mode,
                sections: context.audioAnalysis.sections.length,
                segments: context.audioAnalysis.segments.length,
            } : null,
        }),
        "",
        "Output schema:",
        jsonString({
            summary: "brief story arc",
            beats: [
                {
                    startMs: 0,
                    endMs: 45000,
                    label: "short beat label",
                    imagery: ["image cue 1", "image cue 2"],
                },
            ],
            scenes: [
                {
                    startMs: 0,
                    endMs: 45000,
                    title: "short scene title",
                    mood: "concise mood",
                    imagery: ["visual motif 1", "visual motif 2"],
                    direction: "one sentence describing the composition for ASCII generation",
                },
            ],
        }),
    ].join("\n");
}
function buildAsciiScenePrompt(request, scene) {
    const { context, width, height, asciiSafe } = request;
    return [
        "Generate one ASCII scene for a terminal music visualizer.",
        "Return JSON only. No markdown, no code fences, no explanation.",
        `Output exactly ${height} strings, each exactly ${width} characters long, in the field "ascii".`,
        "Do not include ANSI codes.",
        `Allowed character family: ${approvedCharset(asciiSafe)}`,
        "",
        "Track context:",
        jsonString({
            title: context.title,
            artist: context.artist,
            album: context.album,
            lyricSummary: context.lyricSummaryText,
            styleLabel: context.styleProfile.label,
            genreHints: context.genreHints,
        }),
        "",
        "Scene plan:",
        jsonString(scene),
        "",
        "Output schema:",
        jsonString({
            ascii: new Array(height).fill(" ".repeat(width)),
        }),
    ].join("\n");
}
//# sourceMappingURL=prompt.js.map
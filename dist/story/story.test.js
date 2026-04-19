"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const sanitize_js_1 = require("./sanitize.js");
const schema_js_1 = require("./schema.js");
const cache_js_1 = require("./cache.js");
const prompt_js_1 = require("./prompt.js");
function makeContext() {
    return {
        trackId: "track-1",
        title: "Night Drive",
        artist: "Example Artist",
        album: "After Midnight",
        durationMs: 180_000,
        progressMs: 12_000,
        isPlaying: true,
        playback: {
            is_playing: true,
            progress_ms: 12_000,
            item: {
                id: "track-1",
                name: "Night Drive",
                artists: [{ id: "artist-1", name: "Example Artist" }],
                duration_ms: 180_000,
                album: {
                    name: "After Midnight",
                    images: [],
                },
            },
            device: null,
            currently_playing_type: "track",
        },
        lyricsAvailable: true,
        lyrics: [{ startTimeMs: 0, words: "City lights in the rain" }],
        lyricSummary: {
            mood: "reflective",
            arc: "holding a steady emotional pulse",
            keywords: ["city", "lights", "rain"],
            chorusAnchors: ["city lights in the rain"],
        },
        lyricSummaryText: "reflective | holding a steady emotional pulse",
        artists: [],
        genreHints: ["synthwave"],
        audioFeatures: null,
        audioAnalysis: null,
        styleProfile: {
            label: "steady glow",
            confidence: 0.5,
            glitch: 0.2,
            neon: 0.6,
            organic: 0.2,
            metallic: 0.3,
            softness: 0.4,
            aggression: 0.2,
            density: 0.4,
            groove: 0.5,
            darkness: 0.4,
            dominantPitchClass: 9,
            dominantPitchLabel: "A",
            hue: 210,
            saturation: 0.6,
            brightness: 0.5,
            genreHints: ["synthwave"],
        },
    };
}
(0, node_test_1.default)("sanitizeAsciiLines pads, trims, and removes unsupported characters", () => {
    const lines = (0, sanitize_js_1.sanitizeAsciiLines)(["@@★", "/\\\\||<>"], 5, 3, true);
    strict_1.default.deepEqual(lines, [
        "@@   ",
        "/\\\\||",
        "     ",
    ]);
});
(0, node_test_1.default)("parseStoryPlanResponse normalizes scene timings and honors maxScenes", () => {
    const plan = (0, schema_js_1.parseStoryPlanResponse)(JSON.stringify({
        summary: "A neon ride through midnight streets",
        beats: [{ startMs: 0, endMs: 40_000, label: "glow", imagery: ["lights"] }],
        scenes: [
            { startMs: 0, endMs: 40_000, title: "Street", mood: "tense", imagery: ["road"], direction: "show the road" },
            { startMs: 30_000, endMs: 80_000, title: "Tunnel", mood: "fast", imagery: ["tunnel"], direction: "show depth" },
        ],
    }), { durationMs: 90_000, maxScenes: 1 });
    strict_1.default.equal(plan.summary, "A neon ride through midnight streets");
    strict_1.default.equal(plan.scenes.length, 1);
    strict_1.default.equal(plan.scenes[0]?.startMs, 0);
    strict_1.default.ok((plan.scenes[0]?.endMs ?? 0) > 0);
});
(0, node_test_1.default)("parseAsciiSceneResponse strips wrapper noise and enforces frame dimensions", () => {
    const frame = (0, schema_js_1.parseAsciiSceneResponse)("```json\n{\"ascii\":[\"@@@★\",\"##\"]}\n```", { width: 4, height: 3, asciiSafe: true });
    strict_1.default.deepEqual(frame, [
        "@@@ ",
        "##  ",
        "    ",
    ]);
});
(0, node_test_1.default)("storyboard cache dedupes in-flight generation by key", async () => {
    (0, cache_js_1.clearStoryboardCache)();
    const context = makeContext();
    const promptFingerprint = (0, prompt_js_1.buildPromptFingerprint)(context, {
        width: 32,
        height: 12,
        asciiSafe: true,
        maxScenes: 2,
        modelName: "gemma",
    });
    const key = (0, cache_js_1.buildStoryboardCacheKey)({
        trackId: context.trackId,
        modelName: "gemma",
        width: 32,
        height: 12,
        asciiSafe: true,
        promptFingerprint,
    });
    let calls = 0;
    const storyboard = {
        trackId: context.trackId,
        summary: "A glowing city vignette",
        beats: [],
        scenes: [],
        viewport: { width: 32, height: 12 },
        promptFingerprint,
    };
    const factory = async () => {
        calls += 1;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return storyboard;
    };
    const [first, second] = await Promise.all([
        (0, cache_js_1.getOrCreateStoryboard)(key, factory),
        (0, cache_js_1.getOrCreateStoryboard)(key, factory),
    ]);
    strict_1.default.equal(calls, 1);
    strict_1.default.equal(first, storyboard);
    strict_1.default.equal(second, storyboard);
});
//# sourceMappingURL=story.test.js.map
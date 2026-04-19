"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const lyrics_js_1 = require("./lyrics.js");
const cache_js_1 = require("./cache.js");
const schema_js_1 = require("./schema.js");
(0, node_test_1.default)("parseStoryPlanResponse normalizes scene timing and maxScenes", () => {
    const raw = JSON.stringify({
        summary: "night drive",
        scenes: [
            { title: "one", mood: "tense", imagery: ["road"], direction: "front-facing" },
            { title: "two", mood: "release", imagery: ["lights"], direction: "wide" },
            { title: "three", mood: "extra", imagery: ["ignored"], direction: "wide" },
        ],
    });
    const plan = (0, schema_js_1.parseStoryPlanResponse)(raw, { durationMs: 100_000, maxScenes: 2 });
    strict_1.default.equal(plan.summary, "night drive");
    strict_1.default.equal(plan.scenes.length, 2);
    strict_1.default.equal(plan.scenes[0]?.startMs, 0);
    strict_1.default.equal(plan.scenes[1]?.endMs, 100_000);
});
(0, node_test_1.default)("parseAsciiSceneResponse strips wrappers and pads output", () => {
    const raw = "```json\n{\"ascii\":[\"\\u001b[31m##\\u001b[0m\",\"@\"]}\n```";
    const lines = (0, schema_js_1.parseAsciiSceneResponse)(raw, {
        width: 4,
        height: 3,
        asciiSafe: true,
    });
    strict_1.default.deepEqual(lines, ["##  ", "@   ", "    "]);
});
(0, node_test_1.default)("summarizeLyrics extracts keywords and anchors", () => {
    const summary = (0, lyrics_js_1.summarizeLyrics)([
        { startTimeMs: 0, words: "Rain on the avenue" },
        { startTimeMs: 1_000, words: "Neon in the rear-view" },
        { startTimeMs: 2_000, words: "Rain on the avenue" },
    ]);
    strict_1.default.ok(summary.keywords.includes("rain"));
    strict_1.default.equal(summary.chorusAnchors.length > 0, true);
});
(0, node_test_1.default)("StoryboardCache dedupes in-flight generations", async () => {
    const cache = new cache_js_1.StoryboardCache();
    const key = (0, cache_js_1.buildStoryboardCacheKey)({
        trackId: "track-1",
        modelName: "gemma",
        width: 40,
        height: 12,
        asciiSafe: true,
        promptFingerprint: "fp-1",
    });
    let calls = 0;
    const create = async () => {
        calls += 1;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return {
            trackId: "track-1",
            summary: "summary",
            beats: [],
            scenes: [],
            viewport: { width: 40, height: 12 },
            promptFingerprint: "fp-1",
        };
    };
    const [first, second] = await Promise.all([
        cache.getOrCreate(key, create),
        cache.getOrCreate(key, create),
    ]);
    strict_1.default.equal(calls, 1);
    strict_1.default.equal(first.trackId, second.trackId);
});
//# sourceMappingURL=schema.test.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseStoryPlanResponse = parseStoryPlanResponse;
exports.parseAsciiSceneResponse = parseAsciiSceneResponse;
const sanitize_js_1 = require("./sanitize.js");
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
function parseObject(raw) {
    const cleaned = (0, sanitize_js_1.sanitizeModelText)(raw).trim();
    try {
        return JSON.parse(cleaned);
    }
    catch {
        const start = cleaned.indexOf("{");
        const end = cleaned.lastIndexOf("}");
        if (start >= 0 && end > start) {
            return JSON.parse(cleaned.slice(start, end + 1));
        }
        throw new Error("Model did not return valid JSON.");
    }
}
function asString(value, fallback) {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}
function asStringArray(value) {
    if (!Array.isArray(value))
        return [];
    return value
        .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
        .filter(Boolean);
}
function normaliseBeats(beats, durationMs) {
    if (!Array.isArray(beats))
        return [];
    return beats
        .map((beat, index) => {
        const next = beat;
        const fallbackStart = Math.floor((index * durationMs) / Math.max(1, beats.length));
        const fallbackEnd = Math.floor(((index + 1) * durationMs) / Math.max(1, beats.length));
        return {
            startMs: clamp(Number(next.startMs) || fallbackStart, 0, durationMs),
            endMs: clamp(Number(next.endMs) || fallbackEnd, 0, durationMs),
            label: asString(next.label, `Beat ${index + 1}`),
            imagery: asStringArray(next.imagery).slice(0, 6),
        };
    })
        .map((beat) => ({
        ...beat,
        endMs: Math.max(beat.startMs + 1, beat.endMs),
    }));
}
function normaliseScenes(scenes, durationMs, maxScenes) {
    const source = Array.isArray(scenes) ? scenes.slice(0, maxScenes) : [];
    const count = Math.max(1, source.length);
    const normalised = (source.length > 0 ? source : [{}]).map((scene, index) => {
        const next = scene;
        const fallbackStart = Math.floor((index * durationMs) / count);
        const fallbackEnd = Math.floor(((index + 1) * durationMs) / count);
        return {
            startMs: clamp(Number(next.startMs) || fallbackStart, 0, durationMs),
            endMs: clamp(Number(next.endMs) || fallbackEnd, 0, durationMs),
            title: asString(next.title, `Scene ${index + 1}`),
            mood: asString(next.mood, "cinematic"),
            imagery: asStringArray(next.imagery).slice(0, 8),
            direction: asString(next.direction, "Compose a bold ASCII tableau with strong silhouette and clear depth."),
        };
    });
    for (let i = 0; i < normalised.length; i++) {
        const current = normalised[i];
        if (i === 0)
            current.startMs = 0;
        if (i > 0) {
            current.startMs = Math.max(current.startMs, normalised[i - 1].endMs);
        }
        current.endMs = Math.max(current.startMs + 1, current.endMs);
    }
    normalised[normalised.length - 1].endMs = Math.max(normalised[normalised.length - 1].endMs, durationMs || normalised[normalised.length - 1].endMs);
    return normalised;
}
function parseStoryPlanResponse(raw, options) {
    const parsed = parseObject(raw);
    const durationMs = Math.max(1, options.durationMs);
    return {
        summary: asString(parsed.summary, "A shifting emotional arc rendered as stark ASCII scenes."),
        beats: normaliseBeats(parsed.beats, durationMs),
        scenes: normaliseScenes(parsed.scenes, durationMs, options.maxScenes),
    };
}
function parseAsciiSceneResponse(raw, options) {
    const parsed = parseObject(raw);
    const rawAscii = parsed.ascii;
    if (typeof rawAscii === "string") {
        return (0, sanitize_js_1.sanitizeAsciiLines)((0, sanitize_js_1.sanitizeModelText)(rawAscii).split("\n"), options.width, options.height, options.asciiSafe);
    }
    if (!Array.isArray(rawAscii)) {
        throw new Error("Scene response missing ascii lines.");
    }
    const lines = rawAscii.map((line) => (typeof line === "string" ? line : ""));
    return (0, sanitize_js_1.sanitizeAsciiLines)(lines, options.width, options.height, options.asciiSafe);
}
//# sourceMappingURL=schema.js.map
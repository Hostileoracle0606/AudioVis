"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchLyrics = fetchLyrics;
exports.summarizeLyrics = summarizeLyrics;
exports.formatLyricSummary = formatLyricSummary;
const axios_1 = __importDefault(require("axios"));
const client_js_1 = require("../spotify/client.js");
const LYRICS_ENDPOINT = "https://spclient.wg.spotify.com/color-lyrics/v2/track";
const STOP_WORDS = new Set([
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "but",
    "by",
    "for",
    "from",
    "i",
    "if",
    "in",
    "into",
    "is",
    "it",
    "its",
    "me",
    "my",
    "of",
    "on",
    "or",
    "our",
    "so",
    "that",
    "the",
    "their",
    "them",
    "there",
    "they",
    "this",
    "to",
    "up",
    "we",
    "with",
    "you",
    "your",
]);
function normalizeWords(value) {
    return value.replace(/\s+/g, " ").trim();
}
async function fetchLyrics(trackId) {
    if (!trackId)
        return null;
    try {
        const token = await (0, client_js_1.getAccessToken)();
        const response = await axios_1.default.get(`${LYRICS_ENDPOINT}/${trackId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                "app-platform": "WebPlayer",
            },
            timeout: 8_000,
        });
        const lines = response.data.lyrics?.lines ?? [];
        const parsed = lines
            .map((line) => {
            const startTimeMs = Number.parseInt(line.startTimeMs ?? "", 10);
            return {
                startTimeMs: Number.isFinite(startTimeMs) ? Math.max(0, startTimeMs) : 0,
                words: normalizeWords(line.words ?? ""),
            };
        })
            .filter((line) => line.words.length > 0 || line.startTimeMs > 0);
        return parsed.length > 0 ? parsed : null;
    }
    catch (error) {
        const axiosError = error;
        if ([401, 403, 404].includes(axiosError?.response?.status ?? 0)) {
            return null;
        }
        return null;
    }
}
function lyricAnchors(lines, maxAnchors = 3) {
    const nonEmpty = lines.map((line) => line.words).filter(Boolean);
    if (nonEmpty.length === 0)
        return [];
    if (nonEmpty.length <= maxAnchors)
        return nonEmpty;
    const anchors = [];
    for (let i = 0; i < maxAnchors; i++) {
        const idx = Math.min(nonEmpty.length - 1, Math.floor((i * (nonEmpty.length - 1)) / Math.max(1, maxAnchors - 1)));
        anchors.push(nonEmpty[idx] ?? "");
    }
    return [...new Set(anchors)];
}
function topKeywords(lines, maxKeywords = 8) {
    const counts = new Map();
    for (const line of lines) {
        const tokens = line.words.toLowerCase().match(/[a-z0-9']+/g) ?? [];
        for (const token of tokens) {
            if (token.length < 3 || STOP_WORDS.has(token))
                continue;
            counts.set(token, (counts.get(token) ?? 0) + 1);
        }
    }
    return [...counts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, maxKeywords)
        .map(([token]) => token);
}
function summarizeLyrics(lines) {
    if (lines.length === 0) {
        return {
            mood: "quiet",
            arc: "minimal motion",
            keywords: [],
            chorusAnchors: [],
        };
    }
    const keywords = topKeywords(lines);
    const chorusAnchors = lyricAnchors(lines);
    const sentiment = keywords.some((word) => ["love", "light", "shine", "home", "rise"].includes(word))
        ? "hopeful"
        : keywords.some((word) => ["dark", "alone", "cold", "fall", "lost"].includes(word))
            ? "aching"
            : "reflective";
    const arc = chorusAnchors.length > 0 ? "recurring refrain" : "slow unfolding";
    return {
        mood: sentiment,
        arc,
        keywords,
        chorusAnchors,
    };
}
function formatLyricSummary(summary) {
    const parts = [];
    if (summary.keywords.length > 0) {
        parts.push(`keywords: ${summary.keywords.join(", ")}`);
    }
    if (summary.chorusAnchors.length > 0) {
        parts.push(`anchors: ${summary.chorusAnchors.map((line) => `"${line}"`).join(" / ")}`);
    }
    parts.push(`mood: ${summary.mood}`);
    parts.push(`arc: ${summary.arc}`);
    return parts.join(" | ");
}
//# sourceMappingURL=lyrics.js.map
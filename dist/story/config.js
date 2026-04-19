"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.STORY_RUNTIME_DEFAULTS = void 0;
exports.loadStoryConfig = loadStoryConfig;
exports.isStoryEnabled = isStoryEnabled;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const store_js_1 = require("../config/store.js");
let envLoaded = false;
exports.STORY_RUNTIME_DEFAULTS = {
    enabled: false,
    modelBaseUrl: "http://127.0.0.1:11434",
    modelName: "gemma",
    requestTimeoutMs: 20_000,
    maxScenes: 4,
    endpointPath: "/v1/chat/completions",
    schemaVersion: 1,
    includeLyrics: true,
};
function ensureEnvLoaded() {
    if (envLoaded)
        return;
    dotenv_1.default.config({ path: path_1.default.join(process.cwd(), ".env") });
    envLoaded = true;
}
function parseBoolean(value, fallback) {
    if (typeof value === "boolean")
        return value;
    if (typeof value !== "string")
        return fallback;
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized))
        return true;
    if (["0", "false", "no", "off"].includes(normalized))
        return false;
    return fallback;
}
function parseBoundedInt(value, fallback, min, max) {
    const numeric = typeof value === "string" ? Number.parseInt(value, 10) : Number(value);
    if (!Number.isFinite(numeric))
        return fallback;
    return Math.max(min, Math.min(max, Math.round(numeric)));
}
function resolveString(value, fallback) {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}
function loadStoryConfig(overrides = {}) {
    ensureEnvLoaded();
    const config = (0, store_js_1.loadConfig)();
    return {
        enabled: overrides.enabled ?? parseBoolean(process.env.STORY_VIS_ENABLED ?? config.story?.enabled, exports.STORY_RUNTIME_DEFAULTS.enabled),
        modelBaseUrl: overrides.modelBaseUrl ?? resolveString(process.env.STORY_VIS_MODEL_BASE_URL ?? config.story?.modelBaseUrl, exports.STORY_RUNTIME_DEFAULTS.modelBaseUrl),
        modelName: overrides.modelName ?? resolveString(process.env.STORY_VIS_MODEL_NAME ?? config.story?.modelName, exports.STORY_RUNTIME_DEFAULTS.modelName),
        requestTimeoutMs: overrides.requestTimeoutMs ?? parseBoundedInt(process.env.STORY_VIS_TIMEOUT_MS ?? config.story?.requestTimeoutMs, exports.STORY_RUNTIME_DEFAULTS.requestTimeoutMs, 1_000, 120_000),
        maxScenes: overrides.maxScenes ?? parseBoundedInt(process.env.STORY_VIS_MAX_SCENES ?? config.story?.maxScenes, exports.STORY_RUNTIME_DEFAULTS.maxScenes, 1, 12),
        endpointPath: overrides.endpointPath ?? resolveString(process.env.STORY_VIS_ENDPOINT_PATH ?? config.story?.endpointPath, exports.STORY_RUNTIME_DEFAULTS.endpointPath),
        schemaVersion: overrides.schemaVersion ?? parseBoundedInt(process.env.STORY_VIS_SCHEMA_VERSION ?? config.story?.schemaVersion, exports.STORY_RUNTIME_DEFAULTS.schemaVersion, 1, 99),
        includeLyrics: overrides.includeLyrics ?? parseBoolean(process.env.STORY_VIS_INCLUDE_LYRICS ?? config.story?.includeLyrics, exports.STORY_RUNTIME_DEFAULTS.includeLyrics),
    };
}
function isStoryEnabled(config) {
    return config.enabled && config.modelBaseUrl.length > 0 && config.modelName.length > 0;
}
//# sourceMappingURL=config.js.map
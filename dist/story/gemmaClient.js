"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPromptFingerprint = exports.LocalGemmaStoryClient = void 0;
exports.createGemmaClient = createGemmaClient;
const axios_1 = __importDefault(require("axios"));
const config_js_1 = require("./config.js");
const prompt_js_1 = require("./prompt.js");
Object.defineProperty(exports, "buildPromptFingerprint", { enumerable: true, get: function () { return prompt_js_1.buildPromptFingerprint; } });
const cache_js_1 = require("./cache.js");
const schema_js_1 = require("./schema.js");
function extractResponseText(data) {
    if (typeof data === "string")
        return data.trim();
    if (!data || typeof data !== "object")
        return "";
    const response = data;
    const candidates = [
        response.response,
        response.text,
        response.content,
        response.message?.content,
        response.choices?.[0]?.text,
        response.choices?.[0]?.message?.content,
    ];
    for (const candidate of candidates) {
        if (typeof candidate === "string" && candidate.trim()) {
            return candidate.trim();
        }
    }
    return "";
}
class HttpStoryTransport {
    config;
    constructor(config) {
        this.config = config;
    }
    async generate(prompt) {
        const endpoint = `${this.config.modelBaseUrl.replace(/\/$/, "")}${this.config.endpointPath.startsWith("/") ? "" : "/"}${this.config.endpointPath}`;
        const isChatEndpoint = /chat/i.test(this.config.endpointPath);
        const payload = isChatEndpoint
            ? {
                model: this.config.modelName,
                messages: [{ role: "user", content: prompt }],
                stream: false,
            }
            : {
                model: this.config.modelName,
                prompt,
                stream: false,
            };
        const response = await axios_1.default.post(endpoint, payload, {
            timeout: this.config.requestTimeoutMs,
            headers: { "Content-Type": "application/json" },
        });
        const text = extractResponseText(response.data);
        if (!text) {
            throw new Error("Local Gemma server returned an empty response.");
        }
        return text;
    }
}
class LocalGemmaStoryClient {
    config;
    transport;
    constructor(config = (0, config_js_1.loadStoryConfig)(), transport) {
        this.config = config;
        this.transport = transport ?? new HttpStoryTransport(config);
    }
    async generate(prompt) {
        return this.transport.generate(prompt);
    }
    async generateStoryboard(request) {
        const planRaw = await this.generate((0, prompt_js_1.buildStoryboardPlanPrompt)(request));
        const plan = (0, schema_js_1.parseStoryPlanResponse)(planRaw, {
            durationMs: request.context.durationMs,
            maxScenes: request.maxScenes,
        });
        const scenes = [];
        for (const scenePlan of plan.scenes) {
            const sceneRaw = await this.generate((0, prompt_js_1.buildAsciiScenePrompt)(request, scenePlan));
            const ascii = (0, schema_js_1.parseAsciiSceneResponse)(sceneRaw, {
                width: request.width,
                height: request.height,
                asciiSafe: request.asciiSafe,
            });
            scenes.push({
                startMs: scenePlan.startMs,
                endMs: scenePlan.endMs,
                title: scenePlan.title,
                mood: scenePlan.mood,
                ascii,
            });
        }
        return {
            trackId: request.context.trackId,
            summary: plan.summary,
            beats: plan.beats,
            scenes,
            promptFingerprint: request.promptFingerprint,
            viewport: { width: request.width, height: request.height },
            modelName: this.config.modelName,
            schemaVersion: this.config.schemaVersion,
            generatedAt: Date.now(),
            asciiSafe: request.asciiSafe,
        };
    }
    async generateStoryboardWithCache(cache, context, viewport, request = {
        asciiSafe: true,
        maxScenes: this.config.maxScenes,
        promptFingerprint: (0, prompt_js_1.buildPromptFingerprint)(context, {
            width: viewport.width,
            height: viewport.height,
            asciiSafe: true,
            maxScenes: this.config.maxScenes,
            modelName: this.config.modelName,
        }),
    }) {
        const key = (0, cache_js_1.buildStoryboardCacheKey)({
            trackId: context.trackId,
            modelName: this.config.modelName,
            width: viewport.width,
            height: viewport.height,
            asciiSafe: request.asciiSafe,
            promptFingerprint: request.promptFingerprint,
        });
        return cache.getOrCreate(key, () => this.generateStoryboard({
            context,
            width: viewport.width,
            height: viewport.height,
            asciiSafe: request.asciiSafe,
            maxScenes: request.maxScenes,
            promptFingerprint: request.promptFingerprint,
        }));
    }
}
exports.LocalGemmaStoryClient = LocalGemmaStoryClient;
function createGemmaClient(overrides = {}) {
    const { cache: _cache, ...configOverrides } = overrides;
    return new LocalGemmaStoryClient((0, config_js_1.loadStoryConfig)(configOverrides));
}
//# sourceMappingURL=gemmaClient.js.map
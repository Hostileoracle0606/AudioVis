import type { StoryboardCache } from "./cache.js";
export interface StoryRuntimeConfig {
    enabled: boolean;
    modelBaseUrl: string;
    modelName: string;
    requestTimeoutMs: number;
    maxScenes: number;
    endpointPath: string;
    schemaVersion: number;
    includeLyrics: boolean;
}
export interface StoryRuntimeConfigOverrides {
    enabled?: boolean;
    modelBaseUrl?: string;
    modelName?: string;
    requestTimeoutMs?: number;
    maxScenes?: number;
    endpointPath?: string;
    schemaVersion?: number;
    includeLyrics?: boolean;
    cache?: StoryboardCache;
}
export declare const STORY_RUNTIME_DEFAULTS: StoryRuntimeConfig;
export declare function loadStoryConfig(overrides?: StoryRuntimeConfigOverrides): StoryRuntimeConfig;
export declare function isStoryEnabled(config: StoryRuntimeConfig): boolean;
//# sourceMappingURL=config.d.ts.map
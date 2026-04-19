import { type StoryRuntimeConfig, type StoryRuntimeConfigOverrides } from "./config.js";
import { buildPromptFingerprint } from "./prompt.js";
import { StoryboardCache } from "./cache.js";
import type { StoryGenerationRequest, Storyboard } from "./types.js";
interface StoryModelTransport {
    generate(prompt: string): Promise<string>;
}
export interface StoryModelClient {
    generateStoryboard(request: StoryGenerationRequest): Promise<Storyboard>;
    generateStoryboardWithCache(cache: StoryboardCache, context: StoryGenerationRequest["context"], viewport: {
        width: number;
        height: number;
    }, request?: Omit<StoryGenerationRequest, "context" | "width" | "height">): Promise<Storyboard>;
}
export declare class LocalGemmaStoryClient implements StoryModelClient {
    private readonly config;
    private readonly transport;
    constructor(config?: StoryRuntimeConfig, transport?: StoryModelTransport);
    private generate;
    generateStoryboard(request: StoryGenerationRequest): Promise<Storyboard>;
    generateStoryboardWithCache(cache: StoryboardCache, context: StoryGenerationRequest["context"], viewport: {
        width: number;
        height: number;
    }, request?: Omit<StoryGenerationRequest, "context" | "width" | "height">): Promise<Storyboard>;
}
export declare function createGemmaClient(overrides?: StoryRuntimeConfigOverrides): LocalGemmaStoryClient;
export { buildPromptFingerprint };
//# sourceMappingURL=gemmaClient.d.ts.map
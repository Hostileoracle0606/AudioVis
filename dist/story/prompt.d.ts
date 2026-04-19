import type { StoryContext, StoryGenerationRequest, StoryScenePlan } from "./types.js";
export declare function buildPromptFingerprint(context: StoryContext, args: {
    width: number;
    height: number;
    asciiSafe: boolean;
    maxScenes: number;
    modelName: string;
}): string;
export declare function buildStoryboardPlanPrompt(request: StoryGenerationRequest): string;
export declare function buildAsciiScenePrompt(request: StoryGenerationRequest, scene: StoryScenePlan): string;
//# sourceMappingURL=prompt.d.ts.map
import type { StoryPlan } from "./types.js";
export declare function parseStoryPlanResponse(raw: string, options: {
    durationMs: number;
    maxScenes: number;
}): StoryPlan;
export declare function parseAsciiSceneResponse(raw: string, options: {
    width: number;
    height: number;
    asciiSafe: boolean;
}): string[];
//# sourceMappingURL=schema.d.ts.map
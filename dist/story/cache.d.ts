import type { Storyboard } from "./types.js";
export declare function buildStoryboardCacheKey(args: {
    trackId: string;
    modelName: string;
    width: number;
    height: number;
    asciiSafe: boolean;
    promptFingerprint: string;
}): string;
export declare class StoryboardCache {
    private readonly cache;
    private readonly inFlight;
    get(key: string): Storyboard | undefined;
    set(key: string, storyboard: Storyboard): void;
    delete(key: string): void;
    deleteTrack(trackId: string): void;
    clear(): void;
    getOrCreate(key: string, create: () => Promise<Storyboard>): Promise<Storyboard>;
}
export declare function getCachedStoryboard(key: string): Storyboard | undefined;
export declare function clearStoryboardCache(): void;
export declare function getOrCreateStoryboard(key: string, create: () => Promise<Storyboard>): Promise<Storyboard>;
//# sourceMappingURL=cache.d.ts.map
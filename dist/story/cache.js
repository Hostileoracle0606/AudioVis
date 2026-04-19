"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoryboardCache = void 0;
exports.buildStoryboardCacheKey = buildStoryboardCacheKey;
exports.getCachedStoryboard = getCachedStoryboard;
exports.clearStoryboardCache = clearStoryboardCache;
exports.getOrCreateStoryboard = getOrCreateStoryboard;
const sharedCache = new Map();
const sharedInFlight = new Map();
function buildStoryboardCacheKey(args) {
    return [
        args.trackId,
        args.modelName,
        `${args.width}x${args.height}`,
        args.asciiSafe ? "ascii" : "unicode",
        args.promptFingerprint,
    ].join("::");
}
class StoryboardCache {
    cache = new Map();
    inFlight = new Map();
    get(key) {
        return this.cache.get(key);
    }
    set(key, storyboard) {
        this.cache.set(key, storyboard);
    }
    delete(key) {
        this.cache.delete(key);
        this.inFlight.delete(key);
    }
    deleteTrack(trackId) {
        for (const [key, storyboard] of this.cache.entries()) {
            if (storyboard.trackId === trackId || key.startsWith(`${trackId}::`)) {
                this.cache.delete(key);
            }
        }
        for (const key of this.inFlight.keys()) {
            if (key.startsWith(`${trackId}::`)) {
                this.inFlight.delete(key);
            }
        }
    }
    clear() {
        this.cache.clear();
        this.inFlight.clear();
    }
    async getOrCreate(key, create) {
        const cached = this.cache.get(key);
        if (cached)
            return cached;
        const existing = this.inFlight.get(key);
        if (existing)
            return existing;
        const next = create()
            .then((storyboard) => {
            this.cache.set(key, storyboard);
            return storyboard;
        })
            .finally(() => {
            this.inFlight.delete(key);
        });
        this.inFlight.set(key, next);
        return next;
    }
}
exports.StoryboardCache = StoryboardCache;
function getCachedStoryboard(key) {
    return sharedCache.get(key);
}
function clearStoryboardCache() {
    sharedCache.clear();
    sharedInFlight.clear();
}
async function getOrCreateStoryboard(key, create) {
    const cached = sharedCache.get(key);
    if (cached)
        return cached;
    const existing = sharedInFlight.get(key);
    if (existing)
        return existing;
    const next = create()
        .then((storyboard) => {
        sharedCache.set(key, storyboard);
        return storyboard;
    })
        .finally(() => {
        sharedInFlight.delete(key);
    });
    sharedInFlight.set(key, next);
    return next;
}
//# sourceMappingURL=cache.js.map
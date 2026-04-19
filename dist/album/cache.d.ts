import type { AsciiArt } from "./converter.js";
/**
 * Retrieve cached art by track ID. Returns undefined on miss.
 * Refreshes insertion order (LRU).
 */
export declare function getCached(trackId: string): AsciiArt | undefined;
/**
 * Store art in the cache. Evicts the least-recently-used entry if over MAX_SIZE.
 */
export declare function setCached(trackId: string, art: AsciiArt): void;
//# sourceMappingURL=cache.d.ts.map
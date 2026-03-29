import type { AsciiArt } from "./converter.js";

const MAX_SIZE = 3;
const _cache = new Map<string, AsciiArt>();

/**
 * Retrieve cached art by track ID. Returns undefined on miss.
 * Refreshes insertion order (LRU).
 */
export function getCached(trackId: string): AsciiArt | undefined {
  const entry = _cache.get(trackId);
  if (entry === undefined) return undefined;
  // Refresh: delete + re-insert moves to "most recently used" position
  _cache.delete(trackId);
  _cache.set(trackId, entry);
  return entry;
}

/**
 * Store art in the cache. Evicts the least-recently-used entry if over MAX_SIZE.
 */
export function setCached(trackId: string, art: AsciiArt): void {
  if (_cache.has(trackId)) _cache.delete(trackId);
  _cache.set(trackId, art);
  if (_cache.size > MAX_SIZE) {
    // Map iterates in insertion order — first key is LRU
    const lruKey = _cache.keys().next().value;
    if (lruKey !== undefined) _cache.delete(lruKey);
  }
}

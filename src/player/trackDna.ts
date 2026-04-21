export const KEY_NAMES = ["c","c#","d","d#","e","f","f#","g","g#","a","a#","b"] as const;
export type KeyName = typeof KEY_NAMES[number];

export interface TrackDna {
  bpm: number;
  key: KeyName;
  keyMode: "maj" | "min";
  lufs: number;
  energy: number;
  valence: number;
  danceability: number;
  acousticness: number;
}

function djb2(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return h >>> 0;
}

function splitmix32(seed: number): () => number {
  let z = seed >>> 0;
  return () => {
    z = (z + 0x9e3779b9) >>> 0;
    let t = z;
    t = Math.imul(t ^ (t >>> 16), 0x21f0aaad) >>> 0;
    t = Math.imul(t ^ (t >>> 15), 0x735a2d97) >>> 0;
    return (t ^ (t >>> 15)) >>> 0;
  };
}

/** Pure function: same input → same TrackDna. */
export function computeDna(id: string): TrackDna {
  const seed = djb2(id);
  const next = splitmix32(seed);
  const bpm = 72 + (next() % 97);                     // 72..168
  const keyIdx = next() % 12;
  const keyMode: "maj" | "min" = (next() & 1) ? "maj" : "min";
  const lufs = -4 - (next() % 16);                    // -4..-19
  const energy = next() % 101;
  const valence = next() % 101;
  const danceability = next() % 101;
  const acousticness = next() % 101;
  return {
    bpm, key: KEY_NAMES[keyIdx], keyMode, lufs,
    energy, valence, danceability, acousticness,
  };
}

/** Stable short catalog number for a track, zero-padded to 3 chars. */
export function catalogNumber(id: string): string {
  return String(djb2(id) % 1000).padStart(3, "0");
}

export declare const KEY_NAMES: readonly ["c", "c#", "d", "d#", "e", "f", "f#", "g", "g#", "a", "a#", "b"];
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
/** Pure function: same input → same TrackDna. */
export declare function computeDna(id: string): TrackDna;
/** Stable short catalog number for a track, zero-padded to 3 chars. */
export declare function catalogNumber(id: string): string;
//# sourceMappingURL=trackDna.d.ts.map
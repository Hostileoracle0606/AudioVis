import type { LyricLine, StoryLyricSummary } from "./types.js";
export declare function fetchLyrics(trackId: string): Promise<LyricLine[] | null>;
export declare function summarizeLyrics(lines: LyricLine[]): StoryLyricSummary;
export declare function formatLyricSummary(summary: StoryLyricSummary): string;
//# sourceMappingURL=lyrics.d.ts.map
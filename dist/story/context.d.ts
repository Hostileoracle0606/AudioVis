import type { PlayerState } from "../player/types.js";
import type { SpotifyPlaybackState } from "../spotify/types.js";
import type { StoryContextBuildResult } from "./types.js";
export declare function collectStoryContext(args?: {
    player?: PlayerState;
    playback?: SpotifyPlaybackState | null;
    includeLyrics?: boolean;
}): Promise<StoryContextBuildResult>;
export declare function buildStoryContext(player: PlayerState): Promise<StoryContextBuildResult>;
//# sourceMappingURL=context.d.ts.map
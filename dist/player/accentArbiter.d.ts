import type { AppState } from "./state.js";
export type AccentTarget = "lyric" | "sync" | "bass-bin" | "peak" | "clip" | "lim";
/**
 * Returns the set of accent targets active this frame.
 * Panels are scoped: the lyrics panel always holds "lyric", while the
 * spectrum can separately hold "bass-bin" during onsets, etc. Callers
 * check membership for their own element.
 */
export declare function resolveAccentTargets(state: AppState, nowMs: number): Set<AccentTarget>;
//# sourceMappingURL=accentArbiter.d.ts.map
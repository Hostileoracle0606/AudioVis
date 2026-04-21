import * as spotifyDesktop from "../../macos/spotifyDesktop.js";
import type { AppState } from "../state.js";
import { pushRecentlyPlayed } from "../state.js";

type TrackChangedCallback = (
  trackName: string,
  artistName: string,
  albumName: string,
  albumArtUrl: string,
) => void;

export function startSpotifyFeeder(
  state: AppState,
  onTrackChanged: TrackChangedCallback,
): () => void {
  let inFlight = false;
  let lastKey = "";

  const tick = async () => {
    if (inFlight) return;
    inFlight = true;
    try {
      const s = await spotifyDesktop.getState();
      if (!s) {
        state.nowPlaying = null;
        state.isPlaying = false;
        return;
      }
      state.nowPlaying = s;
      state.isPlaying = s.isPlaying;
      state.progressMs = s.progressMs;
      state.durationMs = s.durationMs;
      const pollAt = Date.now();
      state.lastSpotifyPollAt = pollAt;
      // Re-anchor the extrapolation baseline on every poll. Without this,
      // the render-loop clock would drift past reality after any pause/
      // seek because `baselineAt` only used to reset on track change.
      state.progressBaselineAt = pollAt;
      state.progressBaselineMs = s.progressMs;

      const key = `${s.trackName}\u0000${s.artistName}`;
      if (key !== lastKey) {
        lastKey = key;
        pushRecentlyPlayed(state, s);
        onTrackChanged(s.trackName, s.artistName, s.albumName, s.albumArtUrl);
      }
    } catch {
      state.nowPlaying = null;
    } finally {
      inFlight = false;
    }
  };

  const id = setInterval(tick, 1000);
  void tick();
  return () => clearInterval(id);
}

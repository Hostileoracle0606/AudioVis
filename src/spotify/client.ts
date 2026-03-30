import axios, { AxiosError } from "axios";
import { loadTokens, saveTokens } from "./tokenStore.js";
import { refreshAccessToken } from "./auth.js";
import type {
  SpotifyArtist,
  SpotifyAudioAnalysis,
  SpotifyAudioFeatures,
  SpotifyDevice,
  SpotifyPlaybackState,
} from "./types.js";

const BASE = "https://api.spotify.com/v1";
const audioAnalysisCache = new Map<string, SpotifyAudioAnalysis | null>();
const audioFeaturesCache = new Map<string, SpotifyAudioFeatures | null>();
const artistCache = new Map<string, SpotifyArtist>();

function isOptionalSpotifyMetadataPath(path: string): boolean {
  return (
    path.startsWith("/audio-analysis/") ||
    path.startsWith("/audio-features/") ||
    path.startsWith("/artists?ids=")
  );
}

function isForbiddenError(err: unknown): boolean {
  const ae = err as AxiosError | undefined;
  return ae?.response?.status === 403;
}

export async function getAccessToken(): Promise<string> {
  const tokens = loadTokens();
  if (!tokens) {
    throw new Error(
      'Not authenticated. Run "myviz spotify login" first.'
    );
  }

  // Refresh if expiring within 30 seconds.
  if (Date.now() >= tokens.expires_at - 30_000) {
    const refreshed = await refreshAccessToken(tokens.refresh_token);
    saveTokens(refreshed);
    return refreshed.access_token;
  }

  return tokens.access_token;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function apiGet<T>(path: string): Promise<T | null> {
  const token = await getAccessToken();
  try {
    const res = await axios.get<T>(`${BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  } catch (err) {
    const ae = err as AxiosError;
    if (ae.response?.status === 204 || ae.response?.status === 404) return null;
    if (ae.response?.status === 401) {
      // Token refresh is handled by getAccessToken() on the next call.
      return null;
    }
    if (ae.response?.status === 403 && isOptionalSpotifyMetadataPath(path)) {
      // Some Spotify apps/accounts can read playback state but are denied
      // enrichment endpoints. Treat those responses as optional.
      return null;
    }
    throw err;
  }
}

async function apiPut(path: string, body?: unknown): Promise<void> {
  const token = await getAccessToken();
  try {
    await axios.put(`${BASE}${path}`, body ?? null, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    const ae = err as AxiosError;
    // 204 = success, no content
    if (ae.response?.status === 204) return;
    if (ae.response?.status === 403) {
      // Premium required
      throw new Error(
        "Spotify Premium is required for playback control."
      );
    }
    if (ae.response?.status === 404) {
      throw new Error(
        "No active Spotify device found. Start Spotify on a device first."
      );
    }
    throw err;
  }
}

async function apiPost(path: string, body?: unknown): Promise<void> {
  const token = await getAccessToken();
  try {
    await axios.post(`${BASE}${path}`, body ?? null, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    const ae = err as AxiosError;
    if (ae.response?.status === 204) return;
    if (ae.response?.status === 403) {
      throw new Error(
        "Spotify Premium is required for playback control."
      );
    }
    if (ae.response?.status === 404) {
      throw new Error(
        "No active Spotify device found. Start Spotify on a device first."
      );
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getCurrentPlayback(): Promise<SpotifyPlaybackState | null> {
  return apiGet<SpotifyPlaybackState>("/me/player");
}

export async function getAudioAnalysis(
  trackId: string
): Promise<SpotifyAudioAnalysis | null> {
  if (audioAnalysisCache.has(trackId)) {
    return audioAnalysisCache.get(trackId) ?? null;
  }

  let result: SpotifyAudioAnalysis | null;
  try {
    result = await apiGet<SpotifyAudioAnalysis>(`/audio-analysis/${trackId}`);
  } catch (err) {
    if (!isForbiddenError(err)) throw err;
    result = null;
  }
  audioAnalysisCache.set(trackId, result);
  return result;
}

export async function getAudioFeatures(
  trackId: string
): Promise<SpotifyAudioFeatures | null> {
  if (audioFeaturesCache.has(trackId)) {
    return audioFeaturesCache.get(trackId) ?? null;
  }

  let result: SpotifyAudioFeatures | null;
  try {
    result = await apiGet<SpotifyAudioFeatures>(`/audio-features/${trackId}`);
  } catch (err) {
    if (!isForbiddenError(err)) throw err;
    result = null;
  }
  audioFeaturesCache.set(trackId, result);
  return result;
}

export async function getArtists(artistIds: string[]): Promise<SpotifyArtist[]> {
  const uniqueIds = [...new Set(artistIds.filter(Boolean))];
  const uncached = uniqueIds.filter((id) => !artistCache.has(id));

  if (uncached.length > 0) {
    interface ArtistsResponse {
      artists: SpotifyArtist[];
    }
    try {
      const result = await apiGet<ArtistsResponse>(`/artists?ids=${uncached.join(",")}`);
      for (const artist of result?.artists ?? []) {
        artistCache.set(artist.id, artist);
      }
    } catch (err) {
      if (!isForbiddenError(err)) throw err;
    }
  }

  return uniqueIds.map((id) => artistCache.get(id)).filter(Boolean) as SpotifyArtist[];
}

export async function getDevices(): Promise<SpotifyDevice[]> {
  interface DevicesResponse {
    devices: SpotifyDevice[];
  }
  const res = await apiGet<DevicesResponse>("/me/player/devices");
  return res?.devices ?? [];
}

export async function play(deviceId?: string): Promise<void> {
  const query = deviceId ? `?device_id=${deviceId}` : "";
  await apiPut(`/me/player/play${query}`);
}

export async function pause(deviceId?: string): Promise<void> {
  const query = deviceId ? `?device_id=${deviceId}` : "";
  await apiPut(`/me/player/pause${query}`);
}

export async function nextTrack(deviceId?: string): Promise<void> {
  const query = deviceId ? `?device_id=${deviceId}` : "";
  await apiPost(`/me/player/next${query}`);
}

export async function previousTrack(deviceId?: string): Promise<void> {
  const query = deviceId ? `?device_id=${deviceId}` : "";
  await apiPost(`/me/player/previous${query}`);
}

export async function setVolume(
  percent: number,
  deviceId?: string
): Promise<void> {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  const query = deviceId
    ? `?volume_percent=${clamped}&device_id=${deviceId}`
    : `?volume_percent=${clamped}`;
  await apiPut(`/me/player/volume${query}`);
}

export async function transferPlayback(
  deviceId: string,
  startPlaying = false
): Promise<void> {
  await apiPut("/me/player", {
    device_ids: [deviceId],
    play: startPlaying,
  });
}

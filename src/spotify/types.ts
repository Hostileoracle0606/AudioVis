// Minimal Spotify Web API types — only fields actually used by this app.

export interface TokenPayload {
  access_token: string;
  refresh_token: string;
  expires_in: number;   // seconds
  token_type: string;
  /** Unix timestamp (ms) when the access token expires */
  expires_at: number;
}

export interface SpotifyDevice {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  volume_percent: number | null;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  duration_ms: number;
  album: {
    name: string;
    images: Array<{ url: string; width: number; height: number }>;
  };
}

export interface SpotifyPlaybackState {
  is_playing: boolean;
  progress_ms: number | null;
  item: SpotifyTrack | null;
  device: SpotifyDevice | null;
  /** "track" | "episode" | null */
  currently_playing_type: string | null;
}

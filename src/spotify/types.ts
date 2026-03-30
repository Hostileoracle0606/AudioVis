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
  artists: Array<{ id: string; name: string }>;
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

export interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
}

export interface SpotifyAudioFeatures {
  id: string;
  danceability: number;
  energy: number;
  key: number;
  loudness: number;
  mode: number;
  speechiness: number;
  acousticness: number;
  instrumentalness: number;
  liveness: number;
  valence: number;
  tempo: number;
  time_signature: number;
}

export interface SpotifyTimeSpan {
  start: number;
  duration: number;
  confidence: number;
}

export interface SpotifySegment extends SpotifyTimeSpan {
  loudness_start: number;
  loudness_max_time: number;
  loudness_max: number;
  loudness_end: number;
  pitches: number[];
  timbre: number[];
}

export interface SpotifySection extends SpotifyTimeSpan {
  loudness: number;
  tempo: number;
  tempo_confidence: number;
  key: number;
  key_confidence: number;
  mode: number;
  mode_confidence: number;
  time_signature: number;
  time_signature_confidence: number;
}

export interface SpotifyTrackAnalysisSummary {
  duration: number;
  tempo: number;
  tempo_confidence: number;
  time_signature: number;
  key: number;
  mode: number;
}

export interface SpotifyAudioAnalysis {
  track: SpotifyTrackAnalysisSummary;
  bars: SpotifyTimeSpan[];
  beats: SpotifyTimeSpan[];
  tatums: SpotifyTimeSpan[];
  sections: SpotifySection[];
  segments: SpotifySegment[];
}

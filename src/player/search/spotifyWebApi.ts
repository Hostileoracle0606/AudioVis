import realAxios from "axios";
import type { SearchResult } from "../state.js";

type HttpClient = {
  get: (url: string, config?: any) => Promise<{ status: number; data: any }>;
  post: (url: string, body?: any, config?: any) => Promise<{ status: number; data: any }>;
};

let httpClient: HttpClient = realAxios as unknown as HttpClient;

export function __setAxiosForTest(c: HttpClient) { httpClient = c; }

interface TokenCache { token: string; expiresAt: number; }
let tokenCache: TokenCache | null = null;

export function __resetTokenCacheForTest() { tokenCache = null; }

export async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt - now > 60_000) return tokenCache.token;
  const cid = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!cid || !secret) throw new Error("Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET");
  const basic = Buffer.from(`${cid}:${secret}`).toString("base64");
  const res = await httpClient.post(
    "https://accounts.spotify.com/api/token",
    "grant_type=client_credentials",
    {
      headers: {
        "Authorization": `Basic ${basic}`,
        "Content-Type":  "application/x-www-form-urlencoded",
      },
    }
  );
  const token = res.data.access_token as string;
  const expiresIn = (res.data.expires_in as number) ?? 3600;
  tokenCache = { token, expiresAt: now + expiresIn * 1000 };
  return token;
}

export async function searchTracks(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  let token = await getAccessToken();
  const doSearch = async (tk: string) => httpClient.get(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(trimmed)}&type=track&limit=8`,
    { headers: { Authorization: `Bearer ${tk}` }, signal }
  );
  let res;
  try {
    res = await doSearch(token);
  } catch (err: any) {
    if (err?.response?.status === 401) {
      tokenCache = null;
      token = await getAccessToken();
      res = await doSearch(token);
    } else {
      throw err;
    }
  }
  const items = (res.data?.tracks?.items ?? []) as any[];
  return items.map((it) => ({
    id: it.id,
    uri: it.uri,
    name: it.name,
    artist: (it.artists ?? []).map((a: any) => a.name).join(", "),
    album: it.album?.name ?? "",
    durationMs: it.duration_ms ?? 0,
  }));
}

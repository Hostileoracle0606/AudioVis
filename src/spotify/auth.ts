import http from "http";
import { URL } from "url";
import axios from "axios";
import open from "open";
import { loadEnv } from "../utils/env.js";
import { saveTokens, loadTokens } from "./tokenStore.js";
import type { TokenPayload } from "./types.js";

const SCOPES = [
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
].join(" ");

export function buildAuthUrl(): string {
  const env = loadEnv();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: env.clientId,
    scope: SCOPES,
    redirect_uri: env.redirectUri,
  });
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export async function exchangeCode(code: string): Promise<TokenPayload> {
  const env = loadEnv();
  const credentials = Buffer.from(
    `${env.clientId}:${env.clientSecret}`
  ).toString("base64");

  const res = await axios.post<Omit<TokenPayload, "expires_at">>(
    "https://accounts.spotify.com/api/token",
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: env.redirectUri,
    }),
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  const now = Date.now();
  return {
    ...res.data,
    expires_at: now + res.data.expires_in * 1000,
  };
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<TokenPayload> {
  const env = loadEnv();
  const credentials = Buffer.from(
    `${env.clientId}:${env.clientSecret}`
  ).toString("base64");

  const res = await axios.post<Omit<TokenPayload, "expires_at">>(
    "https://accounts.spotify.com/api/token",
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  const current = loadTokens();
  const now = Date.now();
  return {
    ...res.data,
    // Spotify may not return a new refresh token; keep the old one.
    refresh_token: res.data.refresh_token ?? current?.refresh_token ?? refreshToken,
    expires_at: now + res.data.expires_in * 1000,
  };
}

/**
 * Full login flow: open browser, start callback server, exchange code.
 * Returns the saved TokenPayload.
 */
export async function login(): Promise<TokenPayload> {
  const env = loadEnv();
  const callbackPort = env.callbackPort;

  return new Promise<TokenPayload>((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      if (!req.url) return;

      try {
        const parsed = new URL(req.url, `http://localhost:${callbackPort}`);
        if (parsed.pathname !== "/callback") {
          res.writeHead(404);
          res.end("Not found");
          return;
        }

        const error = parsed.searchParams.get("error");
        if (error) {
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(
            `<h2>Authorization denied: ${error}</h2><p>You may close this tab.</p>`
          );
          server.close();
          reject(new Error(`Spotify auth denied: ${error}`));
          return;
        }

        const code = parsed.searchParams.get("code");
        if (!code) {
          res.writeHead(400);
          res.end("Missing code");
          server.close();
          reject(new Error("No authorization code in callback"));
          return;
        }

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(
          `<h2>Login successful!</h2><p>Return to your terminal. You may close this tab.</p>`
        );

        const tokens = await exchangeCode(code);
        saveTokens(tokens);
        server.close();
        resolve(tokens);
      } catch (err) {
        server.close();
        reject(err);
      }
    });

    server.listen(callbackPort, "127.0.0.1", async () => {
      const authUrl = buildAuthUrl();
      console.log(`\nOpening browser for Spotify login...\nURL: ${authUrl}\n`);
      await open(authUrl);
    });

    server.on("error", (err) => {
      reject(new Error(`Callback server error: ${err.message}`));
    });
  });
}

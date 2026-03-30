import dotenv from "dotenv";
import path from "path";
import { loadConfig } from "../config/store.js";

let loaded = false;

export interface AppEnv {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  callbackPort: number;
}

export function loadEnv(): AppEnv {
  if (!loaded) {
    dotenv.config({ path: path.join(process.cwd(), ".env") });
    loaded = true;
  }

  const config = loadConfig();
  const clientId = process.env.SPOTIFY_CLIENT_ID ?? config.spotify?.clientId;
  const clientSecret =
    process.env.SPOTIFY_CLIENT_SECRET ?? config.spotify?.clientSecret;
  const redirectUri =
    process.env.SPOTIFY_REDIRECT_URI ??
    config.spotify?.redirectUri ??
    "http://127.0.0.1:8888/callback";
  const callbackPort = parseInt(
    process.env.SPOTIFY_CALLBACK_PORT ??
      String(config.spotify?.callbackPort ?? 8888),
    10
  );

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET.\n" +
        "Run `myviz setup` or copy .env.example to .env and fill in your Spotify app credentials."
    );
  }

  return { clientId, clientSecret, redirectUri, callbackPort };
}

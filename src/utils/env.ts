import dotenv from "dotenv";
import path from "path";

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

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri =
    process.env.SPOTIFY_REDIRECT_URI ?? "http://127.0.0.1:8888/callback";
  const callbackPort = parseInt(
    process.env.SPOTIFY_CALLBACK_PORT ?? "8888",
    10
  );

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET.\n" +
        "Copy .env.example to .env and fill in your Spotify app credentials."
    );
  }

  return { clientId, clientSecret, redirectUri, callbackPort };
}

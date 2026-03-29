import type { Command } from "commander";
import { login } from "../../spotify/auth.js";
import { fatalError } from "../../utils/errors.js";
import pc from "picocolors";

export function registerSpotifyLogin(spotify: Command): void {
  spotify
    .command("login")
    .description("Authenticate with Spotify (opens browser)")
    .action(async () => {
      try {
        console.log("Starting Spotify login...");
        const tokens = await login();
        console.log(pc.green("\nLogin successful!"));
        console.log(`Access token expires in ${tokens.expires_in}s`);
      } catch (err) {
        fatalError("Login failed", err);
      }
    });
}

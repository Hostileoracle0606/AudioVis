import type { Command } from "commander";
import { nextTrack } from "../../spotify/client.js";
import { fatalError } from "../../utils/errors.js";
import pc from "picocolors";

export function registerSpotifyNext(spotify: Command): void {
  spotify
    .command("next")
    .description("Skip to next track")
    .option("--device <id>", "Target device ID")
    .action(async (opts: { device?: string }) => {
      try {
        await nextTrack(opts.device);
        console.log(pc.green("Skipped to next track."));
      } catch (err) {
        fatalError("Failed to skip track", err);
      }
    });
}

import type { Command } from "commander";
import { previousTrack } from "../../spotify/client.js";
import { fatalError } from "../../utils/errors.js";
import pc from "picocolors";

export function registerSpotifyPrev(spotify: Command): void {
  spotify
    .command("prev")
    .description("Skip to previous track")
    .option("--device <id>", "Target device ID")
    .action(async (opts: { device?: string }) => {
      try {
        await previousTrack(opts.device);
        console.log(pc.green("Skipped to previous track."));
      } catch (err) {
        fatalError("Failed to go to previous track", err);
      }
    });
}

import type { Command } from "commander";
import { pause } from "../../spotify/client.js";
import { fatalError } from "../../utils/errors.js";
import pc from "picocolors";

export function registerSpotifyPause(spotify: Command): void {
  spotify
    .command("pause")
    .description("Pause playback")
    .option("--device <id>", "Target device ID")
    .action(async (opts: { device?: string }) => {
      try {
        await pause(opts.device);
        console.log(pc.yellow("Playback paused."));
      } catch (err) {
        fatalError("Failed to pause playback", err);
      }
    });
}

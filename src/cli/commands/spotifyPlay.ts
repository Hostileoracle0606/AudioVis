import type { Command } from "commander";
import { play } from "../../spotify/client.js";
import { fatalError } from "../../utils/errors.js";
import pc from "picocolors";

export function registerSpotifyPlay(spotify: Command): void {
  spotify
    .command("play")
    .description("Resume playback")
    .option("--device <id>", "Target device ID")
    .action(async (opts: { device?: string }) => {
      try {
        await play(opts.device);
        console.log(pc.green("Playback started."));
      } catch (err) {
        fatalError("Failed to start playback", err);
      }
    });
}

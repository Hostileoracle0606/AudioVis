import type { Command } from "commander";
import { setVolume } from "../../spotify/client.js";
import { fatalError } from "../../utils/errors.js";
import pc from "picocolors";

export function registerSpotifyVolume(spotify: Command): void {
  spotify
    .command("volume <percent>")
    .description("Set playback volume (0-100)")
    .option("--device <id>", "Target device ID")
    .action(async (percent: string, opts: { device?: string }) => {
      const pct = parseInt(percent, 10);
      if (isNaN(pct) || pct < 0 || pct > 100) {
        console.error(pc.red("Volume must be an integer between 0 and 100."));
        process.exit(1);
      }
      try {
        await setVolume(pct, opts.device);
        console.log(pc.green(`Volume set to ${pct}%.`));
      } catch (err) {
        fatalError("Failed to set volume", err);
      }
    });
}

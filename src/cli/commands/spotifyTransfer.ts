import type { Command } from "commander";
import { transferPlayback } from "../../spotify/client.js";
import { fatalError } from "../../utils/errors.js";
import pc from "picocolors";

export function registerSpotifyTransfer(spotify: Command): void {
  spotify
    .command("transfer <deviceId>")
    .description("Transfer playback to another device")
    .option("--play", "Start playback on the new device", false)
    .action(async (deviceId: string, opts: { play: boolean }) => {
      try {
        await transferPlayback(deviceId, opts.play);
        console.log(pc.green(`Playback transferred to ${deviceId}.`));
      } catch (err) {
        fatalError("Failed to transfer playback", err);
      }
    });
}

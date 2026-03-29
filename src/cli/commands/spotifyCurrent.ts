import type { Command } from "commander";
import { getCurrentPlayback } from "../../spotify/client.js";
import { fatalError } from "../../utils/errors.js";
import { formatSeconds } from "../../ui/format.js";
import pc from "picocolors";

export function registerSpotifyCurrent(spotify: Command): void {
  spotify
    .command("current")
    .description("Show currently playing track")
    .action(async () => {
      try {
        const playback = await getCurrentPlayback();
        if (!playback || !playback.item) {
          console.log(pc.yellow("Nothing is currently playing."));
          return;
        }

        const t = playback.item;
        const artists = t.artists.map((a) => a.name).join(", ");
        const elapsed = formatSeconds((playback.progress_ms ?? 0) / 1000);
        const total = formatSeconds(t.duration_ms / 1000);
        const state = playback.is_playing ? pc.green("Playing") : pc.yellow("Paused");

        console.log(`\n${pc.bold(t.name)}`);
        console.log(`Artist : ${artists}`);
        console.log(`Album  : ${t.album.name}`);
        console.log(`Time   : ${elapsed} / ${total}`);
        console.log(`State  : ${state}`);
        if (playback.device) {
          console.log(`Device : ${playback.device.name} (${playback.device.type})`);
        }
      } catch (err) {
        fatalError("Failed to get current playback", err);
      }
    });
}

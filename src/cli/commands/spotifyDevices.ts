import type { Command } from "commander";
import { getDevices } from "../../spotify/client.js";
import { fatalError } from "../../utils/errors.js";
import pc from "picocolors";

export function registerSpotifyDevices(spotify: Command): void {
  spotify
    .command("devices")
    .description("List available Spotify devices")
    .action(async () => {
      try {
        const devices = await getDevices();
        if (devices.length === 0) {
          console.log(pc.yellow("No devices found. Open Spotify on any device first."));
          return;
        }

        console.log(`\nFound ${devices.length} device(s):\n`);
        for (const d of devices) {
          const active = d.is_active ? pc.green(" [active]") : "";
          const vol = d.volume_percent != null ? ` vol:${d.volume_percent}%` : "";
          console.log(`  ${pc.bold(d.id)}`);
          console.log(`    Name : ${d.name}${active}`);
          console.log(`    Type : ${d.type}${vol}`);
        }
      } catch (err) {
        fatalError("Failed to get devices", err);
      }
    });
}

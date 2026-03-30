import type { Command } from "commander";
import pc from "picocolors";
import { ensureMacosReady } from "../../macos/setup.js";
import { fatalError } from "../../utils/errors.js";

export function registerSetup(program: Command): void {
  program
    .command("setup")
    .description("Run the guided first-run setup flow")
    .action(async () => {
      try {
        if (process.platform === "darwin") {
          const result = await ensureMacosReady();
          console.log(pc.green(`\nSetup complete. Using audio device: ${result.deviceName}`));
          return;
        }

        console.log("No guided setup flow is available for this platform yet.");
      } catch (err) {
        fatalError("Setup failed", err);
      }
    });
}

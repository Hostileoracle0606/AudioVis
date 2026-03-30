import type { Command } from "commander";
import pc from "picocolors";
import { loadConfig } from "../../config/store.js";
import { ensureMacosReady } from "../../macos/setup.js";
import { login } from "../../spotify/auth.js";
import { loadTokens } from "../../spotify/tokenStore.js";
import { fatalError } from "../../utils/errors.js";
import { runVisualizer } from "./visualizer.js";

interface LaunchOptions {
  mode: string;
  bars: string;
  fps: string;
  sampleRate: string;
  fftSize: string;
  asciiSafe: boolean;
  noColor: boolean;
  app?: boolean;
}

export function registerLaunch(program: Command): void {
  program
    .command("launch")
    .description("Prepare the app, then launch the visualizer")
    .option("--mode <wavefield|scroll|spectrum>", "Visualization mode", "wavefield")
    .option("--bars <n>", "Number of spectrum bars", "32")
    .option("--fps <n>", "Target frames per second", "30")
    .option("--sample-rate <n>", "Audio sample rate (Hz)", "44100")
    .option("--fft-size <n>", "FFT frame size (power of 2)", "2048")
    .option("--ascii-safe", "Use ASCII-only characters", false)
    .option("--no-color", "Disable ANSI color", false)
    .option("--app", "Marks that the command is running from the macOS app bundle")
    .action(async (opts: LaunchOptions) => {
      try {
        let audioDevice = loadConfig().audio?.macosDeviceName;

        if (process.platform === "darwin") {
          const result = await ensureMacosReady();
          audioDevice = result.deviceName;
        }

        if (!loadTokens()) {
          console.log(pc.cyan("\nSpotify login"));
          console.log("No saved Spotify session was found, so browser login will start now.");
          await login();
        }

        await runVisualizer({
          ...opts,
          audioDevice,
          silent: false,
        });
      } catch (err) {
        fatalError("Launch failed", err);
      }
    });
}

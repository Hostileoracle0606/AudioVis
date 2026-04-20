import type { Command } from "commander";
import pc from "picocolors";
import { loadConfig } from "../../config/store.js";
import { ensureMacosReady } from "../../macos/setup.js";
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
    .option("--mode <player|wavefield|scroll|spectrum|album-art>", "Visualization mode", "wavefield")
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
          console.log(pc.dim(`Spotify Desktop detected.`));
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

import type { Command } from "commander";
import { createAudioSource } from "../../audio/createAudioSource.js";
import { App } from "../../player/App.js";
import { installCleanupHandlers } from "../../utils/cleanup.js";
import { fatalError } from "../../utils/errors.js";
import { loadConfig } from "../../config/store.js";
import pc from "picocolors";

interface VisOpts {
  audioDevice?: string;
  sampleRate: string;
  fftSize: string;
  noColor: boolean;
  silent: boolean;
}

export async function runVisualizer(opts: VisOpts): Promise<void> {
  const config = loadConfig();
  const sampleRate = parseInt(opts.sampleRate, 10) || 44100;
  const fftSize = parseInt(opts.fftSize, 10) || 2048;
  const audioDevice =
    opts.audioDevice ??
    (process.platform === "darwin" ? config.audio?.macosDeviceName : undefined);

  installCleanupHandlers();

  let audioSource;
  try {
    audioSource = createAudioSource({
      sampleRate,
      frameSize: fftSize,
      deviceName: audioDevice,
      silent: opts.silent,
    });
  } catch (err) {
    fatalError("Failed to create audio source", err);
  }

  console.log(pc.dim(`Platform: ${process.platform}`));
  const info = audioSource.getInfo();
  console.log(pc.dim(`Audio device: ${info.device}`));
  console.log(pc.dim(`Sample rate: ${sampleRate} Hz  FFT size: ${fftSize}`));
  console.log(pc.dim("Starting TUI.AMP v4.0... (press q to quit)\n"));

  await new Promise((r) => setTimeout(r, 600));

  const app = new App({ audio: audioSource, noColor: opts.noColor });

  try {
    await app.start();
    await new Promise<void>(() => {
      // App's quit action calls process.exit()
    });
  } catch (err) {
    fatalError("Visualizer error", err);
  }
}

export function registerVisualizer(program: Command): void {
  program
    .command("visualizer")
    .description("Start the TUI.AMP v4.0 fixed-grid player")
    .option("--audio-device <name>", "Audio capture device name or ID")
    .option("--sample-rate <n>", "Audio sample rate (Hz)", "44100")
    .option("--fft-size <n>", "FFT frame size (power of 2)", "2048")
    .option("--no-color", "Disable ANSI color", false)
    .option("--silent", "Skip audio capture; emit silence (useful without BlackHole)", false)
    .action(async (opts: VisOpts) => {
      await runVisualizer(opts);
    });
}

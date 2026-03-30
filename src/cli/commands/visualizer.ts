import type { Command } from "commander";
import { createAudioSource } from "../../audio/createAudioSource.js";
import { VisualizerEngine } from "../../visualizer/engine.js";
import { installCleanupHandlers } from "../../utils/cleanup.js";
import { fatalError } from "../../utils/errors.js";
import type { VisMode } from "../../visualizer/state.js";
import { loadConfig } from "../../config/store.js";
import pc from "picocolors";

interface VisOpts {
  mode: string;
  bars: string;
  fps: string;
  audioDevice?: string;
  sampleRate: string;
  fftSize: string;
  asciiSafe: boolean;
  noColor: boolean;
  silent: boolean;
}

export async function runVisualizer(opts: VisOpts): Promise<void> {
  const config = loadConfig();
  const mode = (
    opts.mode === "spectrum" ? "spectrum" :
    opts.mode === "scroll" ? "scroll" : "wavefield"
  ) as VisMode;
  const numBars = Math.max(4, Math.min(128, parseInt(opts.bars, 10) || 32));
  const fps = Math.max(5, Math.min(60, parseInt(opts.fps, 10) || 30));
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
  console.log(pc.dim("Starting visualizer... (press q to quit)\n"));

  await new Promise((r) => setTimeout(r, 600));

  const engine = new VisualizerEngine(audioSource, {
    mode,
    numBars,
    fps,
    sampleRate,
    asciiSafe: opts.asciiSafe,
    noColor: !opts.noColor,
  });

  try {
    await engine.start();
    await new Promise<void>(() => {
      // The engine's quit action will call process.exit()
    });
  } catch (err) {
    fatalError("Visualizer error", err);
  }
}

export function registerVisualizer(program: Command): void {
  program
    .command("visualizer")
    .description("Start the full-screen ASCII music visualizer")
    .option("--mode <wavefield|scroll|spectrum>", "Visualization mode", "wavefield")
    .option("--bars <n>", "Number of spectrum bars", "32")
    .option("--fps <n>", "Target frames per second", "30")
    .option("--audio-device <name>", "Audio capture device name or ID")
    .option("--sample-rate <n>", "Audio sample rate (Hz)", "44100")
    .option("--fft-size <n>", "FFT frame size (power of 2)", "2048")
    .option("--ascii-safe", "Use ASCII-only characters", false)
    .option("--no-color", "Disable ANSI color", false)
    .option("--silent", "Skip audio capture; emit silence (useful without BlackHole)", false)
    .action(async (opts: VisOpts) => {
      await runVisualizer(opts);
    });
}

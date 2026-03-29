import type { Command } from "commander";
import { createAudioSource } from "../../audio/createAudioSource.js";
import { VisualizerEngine } from "../../visualizer/engine.js";
import { installCleanupHandlers } from "../../utils/cleanup.js";
import { fatalError } from "../../utils/errors.js";
import type { VisMode } from "../../visualizer/state.js";
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
    .action(async (opts: VisOpts) => {
      const mode = (
        opts.mode === "spectrum" ? "spectrum" :
        opts.mode === "scroll" ? "scroll" : "wavefield"
      ) as VisMode;
      const numBars = Math.max(4, Math.min(128, parseInt(opts.bars, 10) || 32));
      const fps = Math.max(5, Math.min(60, parseInt(opts.fps, 10) || 30));
      const sampleRate = parseInt(opts.sampleRate, 10) || 44100;
      const fftSize = parseInt(opts.fftSize, 10) || 2048;

      // Register cleanup handlers before starting anything
      installCleanupHandlers();

      // Create audio source
      let audioSource;
      try {
        audioSource = createAudioSource({
          sampleRate,
          frameSize: fftSize,
          deviceName: opts.audioDevice,
        });
      } catch (err) {
        fatalError("Failed to create audio source", err);
      }

      console.log(pc.dim(`Platform: ${process.platform}`));
      const info = audioSource.getInfo();
      console.log(pc.dim(`Audio device: ${info.device}`));
      console.log(pc.dim(`Sample rate: ${sampleRate} Hz  FFT size: ${fftSize}`));
      console.log(pc.dim("Starting visualizer... (press q to quit)\n"));

      // Brief pause so messages are visible before alternate screen
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
        // engine.start() is non-blocking — keep the process alive
        await new Promise<void>(() => {
          // The engine's quit action will call process.exit()
        });
      } catch (err) {
        fatalError("Visualizer error", err);
      }
    });
}

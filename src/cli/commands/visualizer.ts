import type { Command } from "commander";
import { createAnalysisSource } from "../../analysis/factory.js";
import { loadConfig } from "../../config/store.js";
import { requirePlayerBackend } from "../../player/factory.js";
import { VisualizerEngine } from "../../visualizer/engine.js";
import { installCleanupHandlers } from "../../utils/cleanup.js";
import { fatalError } from "../../utils/errors.js";
import type { VisMode } from "../../visualizer/state.js";
import { VIS_MODE_IDS } from "../../visualizer/state.js";
import { isVisualizerMode } from "../../visualizer/modes/index.js";
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
  const mode = (isVisualizerMode(opts.mode) ? opts.mode : "wavefield") as VisMode;
  const numBars = Math.max(4, Math.min(128, parseInt(opts.bars, 10) || 32));
  const fps = Math.max(5, Math.min(60, parseInt(opts.fps, 10) || 30));
  const audioDevice =
    opts.audioDevice ??
    config.runtime?.analyzerSource ??
    (process.platform === "darwin" ? config.audio?.macosDeviceName : undefined);

  installCleanupHandlers();

  let playerBackend;
  let analysisSource;
  try {
    playerBackend = await requirePlayerBackend(config);
    analysisSource = createAnalysisSource(config, {
      bars: numBars,
      fps,
      sourceName: audioDevice,
      silent: opts.silent,
    });
  } catch (err) {
    fatalError("Failed to initialize runtime", err);
  }

  console.log(pc.dim(`Platform: ${process.platform}`));
  const info = analysisSource.getInfo();
  console.log(pc.dim(`Player backend: Spotify Desktop`));
  console.log(pc.dim(`Analyzer: ${info.backend}`));
  console.log(pc.dim(`Audio source: ${info.source}`));
  console.log(pc.dim("Starting visualizer... (press q to quit)\n"));

  await new Promise((r) => setTimeout(r, 600));

  const engine = new VisualizerEngine(playerBackend, analysisSource, {
    mode,
    numBars,
    fps,
    asciiSafe: opts.asciiSafe,
    noColor: opts.noColor,
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
    .option(`--mode <${VIS_MODE_IDS.join("|")}>`, "Visualization mode", "wavefield")
    .option("--bars <n>", "Number of spectrum bars", "32")
    .option("--fps <n>", "Target frames per second", "30")
    .option("--audio-device <name>", "Loopback analyzer source name")
    .option("--sample-rate <n>", "Legacy option (ignored in desktop backend)", "44100")
    .option("--fft-size <n>", "Legacy option (ignored in desktop backend)", "2048")
    .option("--ascii-safe", "Use ASCII-only characters", false)
    .option("--no-color", "Disable ANSI color", false)
    .option("--silent", "Skip audio analysis; emit silence for UI testing", false)
    .action(async (opts: VisOpts) => {
      await runVisualizer(opts);
    });
}

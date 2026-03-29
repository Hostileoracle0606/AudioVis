/**
 * Linux audio capture via PulseAudio or PipeWire monitor source.
 *
 * Strategy:
 *   1. Spawn `parecord --monitor` (or `pw-record`) with raw f32le output.
 *   2. Pipe stdout into a rolling buffer.
 *   3. Emit Float32Array frames of `frameSize` samples.
 *
 * The monitor source captures whatever is playing through the default
 * audio output — no extra configuration needed on most desktop distros.
 *
 * If you have multiple sinks you can select one with --audio-device:
 *   myviz visualizer --audio-device alsa_output.pci-0000_00_1f.3.analog-stereo.monitor
 */

import { spawn, ChildProcess } from "child_process";
import type { AudioSource, AudioSourceOptions, AudioSourceInfo } from "../AudioSource.js";

function findMonitorSourceSync(): string {
  // Return a best-guess default monitor source name.
  // On most PulseAudio systems the default monitor is
  // "<default_sink_name>.monitor".
  // We try pactl to discover it; fall back to "default.monitor".
  try {
    const { execSync } = require("child_process") as typeof import("child_process");
    const out = execSync("pactl get-default-sink", { encoding: "utf8", stdio: ["pipe","pipe","pipe"] }).trim();
    if (out) return `${out}.monitor`;
  } catch {
    // pactl not available or failed
  }
  return "default.monitor";
}

export function createLinuxAudioSource(opts: AudioSourceOptions): AudioSource {
  const { sampleRate, frameSize } = opts;
  const device = opts.deviceName ?? findMonitorSourceSync();

  let proc: ChildProcess | null = null;
  const listeners: Array<(frame: Float32Array) => void> = [];
  let buffer = Buffer.alloc(0);
  const bytesPerFrame = frameSize * 4; // f32le = 4 bytes

  return {
    getInfo(): AudioSourceInfo {
      return { platform: "linux", device, sampleRate, frameSize };
    },

    onFrame(cb: (frame: Float32Array) => void): void {
      listeners.push(cb);
    },

    async start(): Promise<void> {
      return new Promise((resolve, reject) => {
        // Try parecord first; fall back to pw-record.
        const args = [
          `--device=${device}`,
          "--raw",
          "--format=float32le",
          `--rate=${sampleRate}`,
          "--channels=1",
          "--latency-msec=50",
        ];

        proc = spawn("parecord", args, { stdio: ["ignore", "pipe", "pipe"] });

        proc.on("error", (err) => {
          // parecord not found; try pw-record
          proc = spawn(
            "pw-record",
            [
              "--target", device,
              "--format", "f32",
              `--rate=${sampleRate}`,
              "--channels=1",
              "-",
            ],
            { stdio: ["ignore", "pipe", "pipe"] }
          );

          proc.on("error", (err2) => {
            reject(
              new Error(
                `Could not start audio capture on Linux.\n` +
                  `Tried 'parecord' and 'pw-record', both failed.\n` +
                  `Install PulseAudio (parecord) or PipeWire (pw-record).\n` +
                  `parecord error: ${err.message}\n` +
                  `pw-record error: ${err2.message}`
              )
            );
          });

          setupPipeHandlers(resolve);
        });

        setupPipeHandlers(resolve);

        function setupPipeHandlers(onReady: () => void): void {
          if (!proc || !proc.stdout) return;

          proc.stdout.on("data", (chunk: Buffer) => {
            buffer = Buffer.concat([buffer, chunk]);

            while (buffer.length >= bytesPerFrame) {
              const frameBuffer = buffer.slice(0, bytesPerFrame);
              buffer = buffer.slice(bytesPerFrame);

              const fa = new Float32Array(
                frameBuffer.buffer,
                frameBuffer.byteOffset,
                frameSize
              );
              for (const cb of listeners) cb(fa);
            }
          });

          proc.stderr?.on("data", () => {
            // Suppress stderr noise from parecord/pw-record
          });

          proc.on("spawn", () => onReady());
        }
      });
    },

    async stop(): Promise<void> {
      if (proc) {
        proc.kill("SIGTERM");
        proc = null;
      }
      buffer = Buffer.alloc(0);
    },
  };
}

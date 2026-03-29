/**
 * Windows audio capture via ffmpeg WASAPI loopback.
 *
 * Requirements:
 *   - ffmpeg must be installed and on PATH (winget install ffmpeg)
 *
 * By default this captures the default WASAPI loopback (system output).
 * You can specify a device name with --audio-device, e.g.:
 *   myviz visualizer --audio-device "Stereo Mix"
 *
 * To list available dshow devices:
 *   ffmpeg -list_devices true -f dshow -i dummy
 *
 * Implementation notes:
 *   ffmpeg is used with -f dshow and the loopback flag to capture
 *   system output audio as raw f32le mono PCM piped to stdout.
 *
 * WASAPI loopback alternative (if dshow fails):
 *   ffmpeg -f wasapi -loopback 1 -i default -ac 1 -ar <rate> -f f32le pipe:1
 */

import { spawn, ChildProcess } from "child_process";
import type { AudioSource, AudioSourceOptions, AudioSourceInfo } from "../AudioSource.js";

export function createWindowsAudioSource(opts: AudioSourceOptions): AudioSource {
  const { sampleRate, frameSize } = opts;
  const deviceName = opts.deviceName ?? "default";

  let proc: ChildProcess | null = null;
  const listeners: Array<(frame: Float32Array) => void> = [];
  let buffer = Buffer.alloc(0);
  const bytesPerFrame = frameSize * 4;

  function buildArgs(): string[] {
    if (deviceName === "default") {
      // WASAPI loopback — captures whatever is playing on the default output
      return [
        "-hide_banner", "-loglevel", "error",
        "-f", "wasapi",
        "-loopback", "1",
        "-i", "default",
        "-ac", "1",
        "-ar", String(sampleRate),
        "-f", "f32le",
        "pipe:1",
      ];
    }
    // DirectShow loopback device by name
    return [
      "-hide_banner", "-loglevel", "error",
      "-f", "dshow",
      "-i", `audio=${deviceName}`,
      "-ac", "1",
      "-ar", String(sampleRate),
      "-f", "f32le",
      "pipe:1",
    ];
  }

  return {
    getInfo(): AudioSourceInfo {
      return { platform: "windows", device: deviceName, sampleRate, frameSize };
    },

    onFrame(cb: (frame: Float32Array) => void): void {
      listeners.push(cb);
    },

    async start(): Promise<void> {
      return new Promise((resolve, reject) => {
        proc = spawn("ffmpeg", buildArgs(), { stdio: ["ignore", "pipe", "pipe"] });

        proc.on("error", (err) => {
          reject(
            new Error(
              `Failed to start ffmpeg for Windows audio capture.\n` +
                `Make sure ffmpeg is installed and on your PATH.\n` +
                `Error: ${err.message}\n\n` +
                `Install: winget install ffmpeg`
            )
          );
        });

        if (!proc.stdout) {
          reject(new Error("ffmpeg stdout not available"));
          return;
        }

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

        proc.on("spawn", () => resolve());
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

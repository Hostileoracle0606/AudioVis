/**
 * macOS audio capture via a virtual loopback device + ffmpeg or sox.
 *
 * IMPORTANT:
 *   macOS does NOT expose system audio output as a capturable input by default.
 *   You MUST install a virtual audio loopback driver such as BlackHole:
 *     https://github.com/ExistentialAudio/BlackHole
 *
 *   Then, in System Preferences → Sound (or Audio MIDI Setup), create a
 *   Multi-Output Device that routes to both your speakers and BlackHole.
 *   Set that Multi-Output Device as your system sound output.
 *
 *   Pass the BlackHole device to the visualizer:
 *     myviz visualizer --audio-device "BlackHole 2ch"
 *
 * This file uses ffmpeg with the avfoundation input format.
 * To list available avfoundation audio devices:
 *   ffmpeg -f avfoundation -list_devices true -i ""
 *
 * You may pass either the device name or its index:
 *   --audio-device "BlackHole 2ch"
 *   --audio-device ":1"   (where 1 is the device index from the list above)
 */

import { spawn, ChildProcess } from "child_process";
import type { AudioSource, AudioSourceOptions, AudioSourceInfo } from "../AudioSource.js";
import { resolveFfmpegBinary } from "../ffmpeg.js";

export function createMacosAudioSource(opts: AudioSourceOptions): AudioSource {
  const { sampleRate, frameSize } = opts;
  const deviceName = opts.deviceName;

  let proc: ChildProcess | null = null;
  const listeners: Array<(frame: Float32Array) => void> = [];
  let buffer = Buffer.alloc(0);
  const NUM_CHANNELS = 2;
  const bytesPerFrame = frameSize * NUM_CHANNELS * 4;  // interleaved stereo f32le

  if (!deviceName) {
    // Fail immediately with a helpful message rather than silently capturing
    // the microphone or nothing.
    const err = new Error(
      "macOS requires a virtual loopback device for system audio capture.\n\n" +
        "Steps:\n" +
        "  1. Install BlackHole: https://github.com/ExistentialAudio/BlackHole\n" +
        "  2. Open Audio MIDI Setup, create a Multi-Output Device that includes\n" +
        "     both your speakers and BlackHole 2ch.\n" +
        "  3. Set the Multi-Output Device as your system sound output.\n" +
        "  4. Re-run with: myviz setup  (or myviz visualizer --audio-device \"BlackHole 2ch\")\n\n" +
        "To list avfoundation audio devices:\n" +
        '  ffmpeg -f avfoundation -list_devices true -i ""'
    );
    // Return a source that immediately throws on start().
    return {
      getInfo: () => ({ platform: "macos", device: "none", sampleRate, frameSize, numChannels: NUM_CHANNELS }),
      onFrame: () => {},
      start: async () => { throw err; },
      stop: async () => {},
    };
  }

  function buildArgs(): string[] {
    // Accept either ":N" (index) or "DeviceName" and normalize to avfoundation format.
    const dn = deviceName as string;
    const avfDevice = dn.startsWith(":") ? dn : `:${dn}`;
    return [
      "-hide_banner", "-loglevel", "error",
      "-f", "avfoundation",
      "-i", avfDevice,
      "-ac", String(NUM_CHANNELS),
      "-ar", String(sampleRate),
      "-f", "f32le",
      "pipe:1",
    ];
  }

  return {
    getInfo(): AudioSourceInfo {
      return { platform: "macos", device: deviceName as string, sampleRate, frameSize, numChannels: NUM_CHANNELS };
    },

    onFrame(cb: (frame: Float32Array) => void): void {
      listeners.push(cb);
    },

    async start(): Promise<void> {
      return new Promise((resolve, reject) => {
        proc = spawn(resolveFfmpegBinary(), buildArgs(), {
          stdio: ["ignore", "pipe", "pipe"],
        });

        proc.on("error", (err) => {
          reject(
            new Error(
              `Failed to start ffmpeg for macOS audio capture.\n` +
                `Ensure ffmpeg is available or use the packaged macOS app bundle.\n` +
                `Error: ${err.message}`
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
              frameSize * NUM_CHANNELS
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

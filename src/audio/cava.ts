/**
 * CavaStream — spawns `cava` as a background subprocess and emits
 * normalized bar-amplitude frames (Float32Array, values 0–1).
 *
 * Falls back gracefully when cava is not installed; callers should
 * listen for the 'unavailable' event and use the audio-DSP pipeline
 * smoothedBuckets as a substitute.
 *
 * cava raw output format: each frame = numBars × 2 bytes,
 * little-endian uint16 per bar (0–65535).
 */

import { EventEmitter } from "events";
import { spawn, type ChildProcess } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

export declare interface CavaStream {
  on(event: "frame",       listener: (bars: Float32Array) => void): this;
  on(event: "unavailable", listener: (reason: string) => void): this;
  on(event: "error",       listener: (err: Error) => void): this;
}

export class CavaStream extends EventEmitter {
  private proc: ChildProcess | null = null;
  private buf  = Buffer.alloc(0);
  private readonly frameBytes: number;
  private readonly configPath: string;

  constructor(
    private readonly numBars   = 16,
    private readonly fps       = 30,
    private readonly audioSrc  = "BlackHole 2ch"
  ) {
    super();
    this.frameBytes  = numBars * 2;
    this.configPath  = path.join(os.tmpdir(), `myviz-cava-${process.pid}.conf`);
  }

  start(): void {
    const cfg = [
      "[general]",
      `bars = ${this.numBars}`,
      `framerate = ${this.fps}`,
      "",
      "[input]",
      "method = portaudio",
      `source = ${this.audioSrc}`,
      "",
      "[output]",
      "method = raw",
      "raw_target = /dev/stdout",
      "bit_format = 16bit",
      "",
    ].join("\n");

    try {
      fs.writeFileSync(this.configPath, cfg, "utf8");
    } catch {
      this.emit("unavailable", "Cannot write cava config");
      return;
    }

    const proc = spawn("cava", ["-p", this.configPath], {
      stdio: ["ignore", "pipe", "ignore"],
    });

    proc.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "ENOENT") {
        this.emit("unavailable", "cava not found — install via `brew install cava`");
      } else {
        this.emit("error", err);
      }
      this.cleanup();
    });

    proc.on("close", (code) => {
      if (code !== 0 && code !== null) {
        this.emit("unavailable", `cava exited with code ${code}`);
      }
      this.cleanup();
    });

    proc.stdout?.on("data", (chunk: Buffer) => {
      this.buf = Buffer.concat([this.buf, chunk]);
      while (this.buf.length >= this.frameBytes) {
        const frame = this.buf.subarray(0, this.frameBytes);
        this.buf     = this.buf.subarray(this.frameBytes);
        const bars   = new Float32Array(this.numBars);
        for (let i = 0; i < this.numBars; i++) {
          bars[i] = frame.readUInt16LE(i * 2) / 65535;
        }
        this.emit("frame", bars);
      }
    });

    this.proc = proc;
  }

  stop(): void {
    this.proc?.kill("SIGTERM");
    this.proc = null;
    this.cleanup();
  }

  private cleanup(): void {
    try { fs.unlinkSync(this.configPath); } catch { /* ignore */ }
  }
}

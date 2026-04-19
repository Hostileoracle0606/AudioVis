"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CavaStream = void 0;
const events_1 = require("events");
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
class CavaStream extends events_1.EventEmitter {
    numBars;
    fps;
    audioSrc;
    proc = null;
    buf = Buffer.alloc(0);
    frameBytes;
    configPath;
    constructor(numBars = 16, fps = 30, audioSrc = "BlackHole 2ch") {
        super();
        this.numBars = numBars;
        this.fps = fps;
        this.audioSrc = audioSrc;
        this.frameBytes = numBars * 2;
        this.configPath = path.join(os.tmpdir(), `myviz-cava-${process.pid}.conf`);
    }
    start() {
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
        }
        catch {
            this.emit("unavailable", "Cannot write cava config");
            return;
        }
        const proc = (0, child_process_1.spawn)("cava", ["-p", this.configPath], {
            stdio: ["ignore", "pipe", "ignore"],
        });
        proc.on("error", (err) => {
            if (err.code === "ENOENT") {
                this.emit("unavailable", "cava not found — install via `brew install cava`");
            }
            else {
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
        proc.stdout?.on("data", (chunk) => {
            this.buf = Buffer.concat([this.buf, chunk]);
            while (this.buf.length >= this.frameBytes) {
                const frame = this.buf.subarray(0, this.frameBytes);
                this.buf = this.buf.subarray(this.frameBytes);
                const bars = new Float32Array(this.numBars);
                for (let i = 0; i < this.numBars; i++) {
                    bars[i] = frame.readUInt16LE(i * 2) / 65535;
                }
                this.emit("frame", bars);
            }
        });
        this.proc = proc;
    }
    stop() {
        this.proc?.kill("SIGTERM");
        this.proc = null;
        this.cleanup();
    }
    cleanup() {
        try {
            fs.unlinkSync(this.configPath);
        }
        catch { /* ignore */ }
    }
}
exports.CavaStream = CavaStream;
//# sourceMappingURL=cava.js.map
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
export declare interface CavaStream {
    on(event: "frame", listener: (bars: Float32Array) => void): this;
    on(event: "unavailable", listener: (reason: string) => void): this;
    on(event: "error", listener: (err: Error) => void): this;
}
export declare class CavaStream extends EventEmitter {
    private readonly numBars;
    private readonly fps;
    private readonly audioSrc;
    private proc;
    private buf;
    private readonly frameBytes;
    private readonly configPath;
    constructor(numBars?: number, fps?: number, audioSrc?: string);
    start(): void;
    stop(): void;
    private cleanup;
}
//# sourceMappingURL=cava.d.ts.map
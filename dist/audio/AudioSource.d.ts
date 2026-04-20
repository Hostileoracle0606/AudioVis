/**
 * AudioSource — interface for platform audio capture backends.
 *
 * Each backend spawns a child process (e.g. parecord, ffmpeg) that
 * streams raw **stereo interleaved** f32le PCM to stdout. Consumers that
 * need mono (e.g. FFT) mix down via dsp/deinterleave.mixToMono; consumers
 * that need per-channel data (e.g. L/R metering) read channels directly
 * from the interleaved frame.
 */
export interface AudioSourceOptions {
    sampleRate: number;
    frameSize: number;
    deviceName?: string;
}
export interface AudioSourceInfo {
    platform: string;
    device: string;
    sampleRate: number;
    frameSize: number;
    numChannels: number;
}
export interface AudioSource {
    start(): Promise<void>;
    stop(): Promise<void>;
    onFrame(cb: (frame: Float32Array) => void): void;
    getInfo(): AudioSourceInfo;
}
//# sourceMappingURL=AudioSource.d.ts.map
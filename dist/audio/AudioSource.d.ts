/**
 * AudioSource — interface for platform audio capture backends.
 *
 * Each backend spawns a child process (e.g. parecord, ffmpeg) that
 * streams raw mono f32le PCM to stdout, which this layer reads and
 * delivers as Float32Array frames.
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
}
export interface AudioSource {
    start(): Promise<void>;
    stop(): Promise<void>;
    onFrame(cb: (frame: Float32Array) => void): void;
    getInfo(): AudioSourceInfo;
}
//# sourceMappingURL=AudioSource.d.ts.map
/**
 * High-level audio features extracted from FFT magnitudes.
 * These drive the wavefield visualizer mode.
 *
 * Band definitions (approximate, assumes 44100 Hz sample rate):
 *   low:  20 –  300 Hz  → bass/kick energy
 *   mid: 300 – 3000 Hz  → melodic/vocal energy
 *   high: 3k – 16k  Hz  → treble/hi-hat energy
 */
export interface AudioFeatures {
    low: number;
    mid: number;
    high: number;
    rms: number;
    pulse: number;
}
export declare function extractFeatures(magnitudes: Float32Array, sampleRate: number): AudioFeatures;
//# sourceMappingURL=features.d.ts.map
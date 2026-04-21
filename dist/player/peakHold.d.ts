export interface PeakHoldBuffer {
    values: Float32Array;
    heldUntilMs: Float64Array;
    lastUpdateMs: number;
}
export declare function createPeakHold(size: number): PeakHoldBuffer;
export declare function updatePeakHold(buf: PeakHoldBuffer, current: Float32Array, now: number, holdMs: number): void;
//# sourceMappingURL=peakHold.d.ts.map
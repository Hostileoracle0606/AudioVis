"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInitialState = createInitialState;
function createInitialState(mode, numBars, cols, rows) {
    return {
        mode,
        smoothedBuckets: new Float32Array(numBars),
        rawBuckets: new Float32Array(numBars),
        low: 0,
        mid: 0,
        high: 0,
        amplitude: 0,
        pulse: 0,
        trackName: "",
        artistName: "",
        deviceName: "",
        isPlaying: false,
        progressMs: 0,
        durationMs: 0,
        cols,
        rows,
        startTime: Date.now(),
        numBars,
        scrollHistory: new Float32Array(cols),
    };
}
//# sourceMappingURL=state.js.map
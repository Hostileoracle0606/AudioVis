"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSilentAnalysisSource = createSilentAnalysisSource;
function createSilentAnalysisSource(bars, fps = 30) {
    const listeners = [];
    const zeroBars = new Float32Array(bars);
    let timer = null;
    return {
        getInfo() {
            return {
                source: "silent",
                bars,
                fps,
                backend: "silent",
            };
        },
        onFrame(cb) {
            listeners.push(cb);
        },
        async start() {
            timer = setInterval(() => {
                const frame = {
                    bars: zeroBars,
                    low: 0,
                    mid: 0,
                    high: 0,
                    amplitude: 0,
                    pulse: 0,
                };
                for (const cb of listeners)
                    cb(frame);
            }, Math.max(16, Math.round(1000 / fps)));
        },
        async stop() {
            if (timer) {
                clearInterval(timer);
                timer = null;
            }
        },
    };
}
//# sourceMappingURL=silent.js.map
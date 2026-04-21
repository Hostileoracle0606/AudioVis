"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPeakHold = createPeakHold;
exports.updatePeakHold = updatePeakHold;
/** Decay rate: 0.02 per 100ms = 0.0002 per ms → value reaches 0 from 1.0 in ~5s */
const DECAY_PER_MS = 0.0002;
function createPeakHold(size) {
    return {
        values: new Float32Array(size),
        heldUntilMs: new Float64Array(size),
        lastUpdateMs: 0,
    };
}
function updatePeakHold(buf, current, now, holdMs) {
    const dt = buf.lastUpdateMs === 0 ? 0 : Math.max(0, now - buf.lastUpdateMs);
    for (let i = 0; i < buf.values.length; i++) {
        const cur = current[i] ?? 0;
        if (cur >= buf.values[i]) {
            buf.values[i] = cur;
            buf.heldUntilMs[i] = now + holdMs;
        }
        else if (now > buf.heldUntilMs[i]) {
            buf.values[i] = Math.max(0, buf.values[i] - DECAY_PER_MS * dt);
        }
    }
    buf.lastUpdateMs = now;
}
//# sourceMappingURL=peakHold.js.map
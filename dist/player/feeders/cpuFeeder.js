"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCpuFeeder = startCpuFeeder;
const node_perf_hooks_1 = require("node:perf_hooks");
function startCpuFeeder(state) {
    let prev = process.cpuUsage();
    let prevT = node_perf_hooks_1.performance.now();
    const id = setInterval(() => {
        const d = process.cpuUsage(prev);
        const now = node_perf_hooks_1.performance.now();
        const elapsedUs = (now - prevT) * 1000;
        const cpuUs = d.user + d.system;
        const raw = elapsedUs > 0 ? (cpuUs / elapsedUs) * 100 : 0;
        const clamped = Math.max(0, Math.min(999, raw));
        state.cpuPct = state.cpuPct * 0.7 + clamped * 0.3;
        prev = process.cpuUsage();
        prevT = now;
    }, 1000);
    return () => clearInterval(id);
}
//# sourceMappingURL=cpuFeeder.js.map
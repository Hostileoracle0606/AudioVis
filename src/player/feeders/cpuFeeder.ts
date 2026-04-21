import { performance } from "node:perf_hooks";
import type { AppState } from "../state.js";

export function startCpuFeeder(state: AppState): () => void {
  let prev = process.cpuUsage();
  let prevT = performance.now();
  const id = setInterval(() => {
    const d = process.cpuUsage(prev);
    const now = performance.now();
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

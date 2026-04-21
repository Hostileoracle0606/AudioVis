"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const padSequencer_js_1 = require("./padSequencer.js");
(0, node_test_1.default)("buildPattern lights exactly `onCount` bulbs and is deterministic", () => {
    const a = (0, padSequencer_js_1.buildPattern)(0xdeadbeef, 3, 2, 7);
    const b = (0, padSequencer_js_1.buildPattern)(0xdeadbeef, 3, 2, 7);
    node_assert_1.default.deepStrictEqual(Array.from(a), Array.from(b), "same inputs must produce identical patterns");
    const sum = a.reduce((acc, v) => acc + v, 0);
    node_assert_1.default.strictEqual(sum, 7, `expected 7 bulbs lit, got ${sum}`);
});
(0, node_test_1.default)("buildPattern with onCount=0 returns all zeros, onCount>=16 returns all ones", () => {
    const zero = (0, padSequencer_js_1.buildPattern)(1, 1, 1, 0);
    const all = (0, padSequencer_js_1.buildPattern)(1, 1, 1, 16);
    node_assert_1.default.strictEqual(zero.reduce((a, v) => a + v, 0), 0);
    node_assert_1.default.strictEqual(all.reduce((a, v) => a + v, 0), 16);
});
(0, node_test_1.default)("computePadFrame advances the active step in time with bpm", () => {
    const bpm = 120; // stepMs = 60000/120 * 0.5 = 250ms
    const f0 = (0, padSequencer_js_1.computePadFrame)("id", bpm, 0, 0, 0);
    const f1 = (0, padSequencer_js_1.computePadFrame)("id", bpm, 250, 0, 0);
    const f2 = (0, padSequencer_js_1.computePadFrame)("id", bpm, 500, 0, 0);
    node_assert_1.default.strictEqual(f0.activeStep, 0);
    node_assert_1.default.strictEqual(f1.activeStep, 1);
    node_assert_1.default.strictEqual(f2.activeStep, 2);
});
(0, node_test_1.default)("computePadFrame wraps active step after 8 steps", () => {
    const bpm = 120;
    const f8 = (0, padSequencer_js_1.computePadFrame)("id", bpm, 250 * 8, 0, 0);
    node_assert_1.default.strictEqual(f8.activeStep, 0);
});
(0, node_test_1.default)("computePadFrame marks flashing=true within the transient window and false after", () => {
    const bpm = 120;
    const hit = (0, padSequencer_js_1.computePadFrame)("id", bpm, 1000, 1000, 1000);
    const late = (0, padSequencer_js_1.computePadFrame)("id", bpm, 1000, 1000, 1000 + 200);
    node_assert_1.default.strictEqual(hit.flashing, true);
    node_assert_1.default.strictEqual(late.flashing, false);
});
(0, node_test_1.default)("the active step's pattern has more lit bulbs than an inactive step's", () => {
    const f = (0, padSequencer_js_1.computePadFrame)("track|artist", 120, 0, 0, 0);
    const activeSum = f.patterns[f.activeStep].reduce((a, v) => a + v, 0);
    const inactive = (f.activeStep + 1) % 8;
    const inactiveSum = f.patterns[inactive].reduce((a, v) => a + v, 0);
    node_assert_1.default.ok(activeSum > inactiveSum, `active ${activeSum} !> inactive ${inactiveSum}`);
});
(0, node_test_1.default)("different tracks produce different pad patterns at the same beat", () => {
    const a = (0, padSequencer_js_1.computePadFrame)("trackA|X", 120, 0, 0, 0);
    const b = (0, padSequencer_js_1.computePadFrame)("trackB|X", 120, 0, 0, 0);
    const same = a.patterns.every((p, i) => p.every((v, j) => v === b.patterns[i][j]));
    node_assert_1.default.ok(!same, "patterns should differ across track ids");
});
//# sourceMappingURL=padSequencer.test.js.map
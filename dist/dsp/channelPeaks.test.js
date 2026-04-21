"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const channelPeaks_js_1 = require("./channelPeaks.js");
const APPROX = 1e-6;
const approxEq = (actual, expected, msg) => node_assert_1.default.ok(Math.abs(actual - expected) < APPROX, msg ?? `expected ${actual} ≈ ${expected} within ${APPROX}`);
(0, node_test_1.default)("extractChannelPeaks on mono returns single peak", () => {
    const buf = new Float32Array([0.1, -0.3, 0.5, -0.7]);
    const [p] = (0, channelPeaks_js_1.extractChannelPeaks)(buf, 1);
    approxEq(p, 0.7);
});
(0, node_test_1.default)("extractChannelPeaks on stereo returns per-channel peaks", () => {
    // Interleaved: L0 R0 L1 R1 L2 R2
    const buf = new Float32Array([0.1, 0.8, 0.2, -0.4, -0.9, 0.3]);
    const [l, r] = (0, channelPeaks_js_1.extractChannelPeaks)(buf, 2);
    approxEq(l, 0.9);
    approxEq(r, 0.8);
});
(0, node_test_1.default)("extractChannelPeaks returns zeros for empty buffer", () => {
    node_assert_1.default.deepStrictEqual((0, channelPeaks_js_1.extractChannelPeaks)(new Float32Array(0), 2), [0, 0]);
});
(0, node_test_1.default)("extractChannelPeaks clamps to [0,1]", () => {
    const buf = new Float32Array([2.0, -3.5]);
    const [l, r] = (0, channelPeaks_js_1.extractChannelPeaks)(buf, 2);
    node_assert_1.default.strictEqual(l, 1);
    node_assert_1.default.strictEqual(r, 1);
});
//# sourceMappingURL=channelPeaks.test.js.map
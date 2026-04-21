"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const peakHold_js_1 = require("./peakHold.js");
(0, node_test_1.default)("new max updates value and extends hold", () => {
    const buf = (0, peakHold_js_1.createPeakHold)(3);
    (0, peakHold_js_1.updatePeakHold)(buf, new Float32Array([0.5, 0.25, 0.75]), 1000, 500);
    node_assert_1.default.deepStrictEqual(Array.from(buf.values), [0.5, 0.25, 0.75]);
    node_assert_1.default.deepStrictEqual(Array.from(buf.heldUntilMs), [1500, 1500, 1500]);
});
(0, node_test_1.default)("lower current does not overwrite during hold", () => {
    const buf = (0, peakHold_js_1.createPeakHold)(2);
    (0, peakHold_js_1.updatePeakHold)(buf, new Float32Array([0.75, 0.25]), 1000, 500);
    (0, peakHold_js_1.updatePeakHold)(buf, new Float32Array([0.125, 0.125]), 1200, 500);
    node_assert_1.default.strictEqual(buf.values[0], 0.75);
    node_assert_1.default.strictEqual(buf.values[1], 0.25);
});
(0, node_test_1.default)("after hold expires, value decays toward 0", () => {
    const buf = (0, peakHold_js_1.createPeakHold)(1);
    (0, peakHold_js_1.updatePeakHold)(buf, new Float32Array([1.0]), 1000, 500);
    // After hold, decay at 0.0002 per ms → 100ms = -0.02
    (0, peakHold_js_1.updatePeakHold)(buf, new Float32Array([0.0]), 1600, 500);
    node_assert_1.default.ok(buf.values[0] < 1.0, "value should decay after hold expires");
    node_assert_1.default.ok(buf.values[0] >= 0, "value should not go negative");
});
(0, node_test_1.default)("value clamps at 0 and does not go negative", () => {
    const buf = (0, peakHold_js_1.createPeakHold)(1);
    (0, peakHold_js_1.updatePeakHold)(buf, new Float32Array([0.01]), 1000, 100);
    (0, peakHold_js_1.updatePeakHold)(buf, new Float32Array([0]), 5000, 100);
    node_assert_1.default.strictEqual(buf.values[0], 0);
});
//# sourceMappingURL=peakHold.test.js.map
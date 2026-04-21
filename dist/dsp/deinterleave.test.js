"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const deinterleave_js_1 = require("./deinterleave.js");
(0, node_test_1.default)("mixToMono averages L and R", () => {
    const interleaved = new Float32Array([0.2, 0.8, -0.4, 0.0]);
    const mono = (0, deinterleave_js_1.mixToMono)(interleaved, 2);
    node_assert_1.default.strictEqual(mono.length, 2);
    node_assert_1.default.ok(Math.abs(mono[0] - 0.5) < 1e-6);
    node_assert_1.default.ok(Math.abs(mono[1] - -0.2) < 1e-6);
});
(0, node_test_1.default)("mixToMono handles already-mono input as passthrough copy", () => {
    const mono = (0, deinterleave_js_1.mixToMono)(new Float32Array([0.1, -0.2]), 1);
    node_assert_1.default.ok(Math.abs(mono[0] - 0.1) < 1e-6);
    node_assert_1.default.ok(Math.abs(mono[1] - -0.2) < 1e-6);
});
(0, node_test_1.default)("extractChannel returns one channel from interleaved stereo", () => {
    const buf = new Float32Array([1, 2, 3, 4, 5, 6]);
    node_assert_1.default.deepStrictEqual(Array.from((0, deinterleave_js_1.extractChannel)(buf, 2, 0)), [1, 3, 5]);
    node_assert_1.default.deepStrictEqual(Array.from((0, deinterleave_js_1.extractChannel)(buf, 2, 1)), [2, 4, 6]);
});
//# sourceMappingURL=deinterleave.test.js.map
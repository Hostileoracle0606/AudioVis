"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const accentArbiter_js_1 = require("./accentArbiter.js");
const state_js_1 = require("./state.js");
(0, node_test_1.default)("default includes lyric", () => {
    const s = (0, state_js_1.createInitialState)(100, 30);
    const set = (0, accentArbiter_js_1.resolveAccentTargets)(s, 10000);
    node_assert_1.default.ok(set.has("lyric"));
});
(0, node_test_1.default)("transient within 100ms adds sync", () => {
    const s = (0, state_js_1.createInitialState)(100, 30);
    s.lastTransientAt = 9950;
    const set = (0, accentArbiter_js_1.resolveAccentTargets)(s, 10000);
    node_assert_1.default.ok(set.has("sync"));
});
(0, node_test_1.default)("transient with high energy within 100ms adds bass-bin", () => {
    const s = (0, state_js_1.createInitialState)(100, 30);
    s.lastTransientAt = 9950;
    s.transientEnergy = 0.8;
    const set = (0, accentArbiter_js_1.resolveAccentTargets)(s, 10000);
    node_assert_1.default.ok(set.has("bass-bin"));
});
(0, node_test_1.default)("transient with low energy does NOT add bass-bin", () => {
    const s = (0, state_js_1.createInitialState)(100, 30);
    s.lastTransientAt = 9950;
    s.transientEnergy = 0.3;
    const set = (0, accentArbiter_js_1.resolveAccentTargets)(s, 10000);
    node_assert_1.default.ok(!set.has("bass-bin"));
});
(0, node_test_1.default)("clip within 200ms adds clip", () => {
    const s = (0, state_js_1.createInitialState)(100, 30);
    s.lastClipAt = 9850;
    const set = (0, accentArbiter_js_1.resolveAccentTargets)(s, 10000);
    node_assert_1.default.ok(set.has("clip"));
});
(0, node_test_1.default)("peak within 200ms adds peak", () => {
    const s = (0, state_js_1.createInitialState)(100, 30);
    s.lastPeakAt = 9850;
    const set = (0, accentArbiter_js_1.resolveAccentTargets)(s, 10000);
    node_assert_1.default.ok(set.has("peak"));
});
(0, node_test_1.default)("expired events do not add targets", () => {
    const s = (0, state_js_1.createInitialState)(100, 30);
    s.lastTransientAt = 9800; // 200ms ago > 100ms window
    s.lastClipAt = 9700; // 300ms ago > 200ms window
    s.lastPeakAt = 9700;
    const set = (0, accentArbiter_js_1.resolveAccentTargets)(s, 10000);
    node_assert_1.default.ok(!set.has("sync"));
    node_assert_1.default.ok(!set.has("clip"));
    node_assert_1.default.ok(!set.has("peak"));
});
(0, node_test_1.default)("all can coexist", () => {
    const s = (0, state_js_1.createInitialState)(100, 30);
    s.lastTransientAt = 9950;
    s.transientEnergy = 0.9;
    s.lastClipAt = 9850;
    s.lastPeakAt = 9850;
    const set = (0, accentArbiter_js_1.resolveAccentTargets)(s, 10000);
    node_assert_1.default.ok(set.has("lyric"));
    node_assert_1.default.ok(set.has("sync"));
    node_assert_1.default.ok(set.has("bass-bin"));
    node_assert_1.default.ok(set.has("clip"));
    node_assert_1.default.ok(set.has("peak"));
});
//# sourceMappingURL=accentArbiter.test.js.map
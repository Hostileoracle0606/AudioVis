"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const trackDna_js_1 = require("./trackDna.js");
(0, node_test_1.default)("computeDna is deterministic", () => {
    const a = (0, trackDna_js_1.computeDna)("killer on the loose|rex vijayan");
    const b = (0, trackDna_js_1.computeDna)("killer on the loose|rex vijayan");
    node_assert_1.default.deepStrictEqual(a, b);
});
(0, node_test_1.default)("computeDna varies across track IDs", () => {
    const ids = Array.from({ length: 100 }, (_, i) => `track-${i}|artist`);
    const bpms = new Set(ids.map((id) => (0, trackDna_js_1.computeDna)(id).bpm));
    node_assert_1.default.ok(bpms.size >= 40, `expected ≥40 unique bpms across 100 tracks, got ${bpms.size}`);
});
(0, node_test_1.default)("computeDna bpm is within 72-168", () => {
    for (let i = 0; i < 1000; i++) {
        const d = (0, trackDna_js_1.computeDna)(`t${i}|a`);
        node_assert_1.default.ok(d.bpm >= 72 && d.bpm <= 168, `bpm ${d.bpm} out of range`);
    }
});
(0, node_test_1.default)("computeDna 0-100 gauges in range", () => {
    for (let i = 0; i < 1000; i++) {
        const d = (0, trackDna_js_1.computeDna)(`t${i}|a`);
        for (const k of ["energy", "valence", "danceability", "acousticness"]) {
            node_assert_1.default.ok(d[k] >= 0 && d[k] <= 100, `${k} ${d[k]} out of range`);
        }
    }
});
(0, node_test_1.default)("computeDna lufs is within -19 to -4", () => {
    for (let i = 0; i < 1000; i++) {
        const d = (0, trackDna_js_1.computeDna)(`t${i}|a`);
        node_assert_1.default.ok(d.lufs >= -19 && d.lufs <= -4, `lufs ${d.lufs} out of range`);
    }
});
(0, node_test_1.default)("computeDna key is in KEY_NAMES", () => {
    const d = (0, trackDna_js_1.computeDna)("x|y");
    node_assert_1.default.ok(trackDna_js_1.KEY_NAMES.includes(d.key));
    node_assert_1.default.ok(["maj", "min"].includes(d.keyMode));
});
//# sourceMappingURL=trackDna.test.js.map
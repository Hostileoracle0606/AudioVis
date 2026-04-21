"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const layout_js_1 = require("./layout.js");
(0, node_test_1.default)("MIN_COLS=108 and MIN_ROWS=28", () => {
    node_assert_1.default.strictEqual(layout_js_1.MIN_COLS, 108);
    node_assert_1.default.strictEqual(layout_js_1.MIN_ROWS, 28);
});
(0, node_test_1.default)("top row: 15 rows tall; screen 28 / pads 36 fixed; now fills the rest", () => {
    const L = (0, layout_js_1.computeAppLayout)(120, 36);
    node_assert_1.default.strictEqual(L.topRow.height, 15);
    node_assert_1.default.strictEqual(L.screenR.width, 28);
    node_assert_1.default.strictEqual(L.padsR.width, 36);
    node_assert_1.default.strictEqual(L.nowR.width, L.inner.width - 28 - 36);
    node_assert_1.default.strictEqual(L.screenR.width + L.nowR.width + L.padsR.width, L.inner.width);
});
(0, node_test_1.default)("middle row has minimum 8 rows", () => {
    const L = (0, layout_js_1.computeAppLayout)(120, 36);
    node_assert_1.default.ok(L.middleRow.height >= 8, `middleRow height ${L.middleRow.height} < 8`);
});
(0, node_test_1.default)("middle halves split 55/45 in favor of lyrics", () => {
    const L = (0, layout_js_1.computeAppLayout)(120, 36);
    node_assert_1.default.ok(L.lyricsR.width > L.spectrumR.width);
    node_assert_1.default.strictEqual(L.lyricsR.width + L.spectrumR.width, L.inner.width);
});
(0, node_test_1.default)("no cross junctions (up and down arrays disjoint)", () => {
    const L = (0, layout_js_1.computeAppLayout)(120, 36);
    for (const x of L.sep2Up)
        node_assert_1.default.ok(!L.sep2Down.includes(x), `cross at x=${x} on sep2`);
});
(0, node_test_1.default)("reports tooSmall below minimums", () => {
    const L = (0, layout_js_1.computeAppLayout)(layout_js_1.MIN_COLS - 1, layout_js_1.MIN_ROWS);
    node_assert_1.default.strictEqual(L.tooSmall, true);
});
//# sourceMappingURL=layout.test.js.map
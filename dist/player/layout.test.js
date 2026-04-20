"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const layout_js_1 = require("./layout.js");
(0, node_test_1.default)("layout tiles inner area exactly (no overlap, no gap)", () => {
    const L = (0, layout_js_1.computeAppLayout)(120, 40);
    node_assert_1.default.strictEqual(L.tooSmall, false);
    // Title bar row
    node_assert_1.default.strictEqual(L.titleBar.y, 1);
    node_assert_1.default.strictEqual(L.titleBar.height, 1);
    // Middle row horizontal halves are equal (the hard requirement)
    node_assert_1.default.strictEqual(L.lyricsR.width, L.spectrumR.width, "middle row halves must be exactly equal in width");
    // Middle row cells together fill the inner width
    node_assert_1.default.strictEqual(L.lyricsR.width + L.spectrumR.width, 118);
    // Top row three columns sum to inner width
    node_assert_1.default.strictEqual(L.artR.width + L.nowR.width + L.recentR.width, 118, "top row columns must sum to inner width");
});
(0, node_test_1.default)("layout reports tooSmall below minimums", () => {
    const L = (0, layout_js_1.computeAppLayout)(layout_js_1.MIN_COLS - 1, layout_js_1.MIN_ROWS);
    node_assert_1.default.strictEqual(L.tooSmall, true);
});
(0, node_test_1.default)("layout provides junction X coordinates for separators", () => {
    const L = (0, layout_js_1.computeAppLayout)(120, 40);
    // sep2 is below the top row: two ┴ (top-row dividers end) + one ┬ (middle-row divider begins)
    node_assert_1.default.strictEqual(L.sep2Up.length, 2);
    node_assert_1.default.strictEqual(L.sep2Down.length, 1);
    // Middle-row divider X = outer.x + 1 + lyricsR.width
    const expectedMid = 1 + L.lyricsR.width;
    node_assert_1.default.strictEqual(L.sep2Down[0], expectedMid);
});
//# sourceMappingURL=layout.test.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const renderer_js_1 = require("./renderer.js");
const borders_js_1 = require("./borders.js");
(0, node_test_1.default)("drawOuterFrame renders rounded corners and edges", () => {
    const r = new renderer_js_1.Renderer(6, 4);
    (0, borders_js_1.drawOuterFrame)(r);
    const lines = r.debugLines();
    node_assert_1.default.strictEqual(lines[0], "\u256D\u2500\u2500\u2500\u2500\u256E"); // ╭────╮
    node_assert_1.default.strictEqual(lines[1], "\u2502    \u2502"); // │    │
    node_assert_1.default.strictEqual(lines[2], "\u2502    \u2502");
    node_assert_1.default.strictEqual(lines[3], "\u2570\u2500\u2500\u2500\u2500\u256F"); // ╰────╯
});
(0, node_test_1.default)("drawHSeparator draws ├─...─┤ with ┬/┴ junctions at specified X", () => {
    const r = new renderer_js_1.Renderer(10, 3);
    (0, borders_js_1.drawOuterFrame)(r);
    (0, borders_js_1.drawHSeparator)(r, 1, { down: [3, 6], up: [] });
    const line = r.debugLines()[1];
    node_assert_1.default.strictEqual(line[0], "\u251C"); // ├
    node_assert_1.default.strictEqual(line[3], "\u252C"); // ┬
    node_assert_1.default.strictEqual(line[6], "\u252C"); // ┬
    node_assert_1.default.strictEqual(line[9], "\u2524"); // ┤
    node_assert_1.default.ok(!line.includes("\u253C"), "must never produce ┼");
});
(0, node_test_1.default)("drawHSeparator handles mixed up/down junctions without ┼", () => {
    const r = new renderer_js_1.Renderer(12, 3);
    (0, borders_js_1.drawOuterFrame)(r);
    (0, borders_js_1.drawHSeparator)(r, 1, { down: [6], up: [3, 9] });
    const line = r.debugLines()[1];
    node_assert_1.default.strictEqual(line[3], "\u2534"); // ┴
    node_assert_1.default.strictEqual(line[6], "\u252C"); // ┬
    node_assert_1.default.strictEqual(line[9], "\u2534"); // ┴
    node_assert_1.default.ok(!line.includes("\u253C"));
});
(0, node_test_1.default)("drawVDivider renders │ vertical run", () => {
    const r = new renderer_js_1.Renderer(5, 5);
    (0, borders_js_1.drawOuterFrame)(r);
    (0, borders_js_1.drawVDivider)(r, 2, 1, 3);
    const lines = r.debugLines();
    node_assert_1.default.strictEqual(lines[1][2], "\u2502");
    node_assert_1.default.strictEqual(lines[2][2], "\u2502");
    node_assert_1.default.strictEqual(lines[3][2], "\u2502");
});
//# sourceMappingURL=borders.test.js.map
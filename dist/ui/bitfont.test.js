"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const bitfont_js_1 = require("./bitfont.js");
(0, node_test_1.default)("every glyph is exactly GLYPH_H rows tall", () => {
    for (const [ch, rows] of Object.entries(bitfont_js_1.GLYPHS)) {
        node_assert_1.default.strictEqual(rows.length, bitfont_js_1.GLYPH_H, `glyph '${ch}' has ${rows.length} rows, want ${bitfont_js_1.GLYPH_H}`);
    }
});
(0, node_test_1.default)("every glyph row is exactly GLYPH_W cells wide", () => {
    for (const [ch, rows] of Object.entries(bitfont_js_1.GLYPHS)) {
        for (let i = 0; i < rows.length; i++) {
            node_assert_1.default.strictEqual(rows[i].length, bitfont_js_1.GLYPH_W, `glyph '${ch}' row ${i} width ${rows[i].length}, want ${bitfont_js_1.GLYPH_W}`);
        }
    }
});
(0, node_test_1.default)("every glyph uses only allowed block characters", () => {
    const allowed = new Set([" ", "\u2588", "\u2593", "\u2592", "\u2591"]);
    for (const [ch, rows] of Object.entries(bitfont_js_1.GLYPHS)) {
        for (const row of rows) {
            for (const c of row) {
                node_assert_1.default.ok(allowed.has(c), `glyph '${ch}' contains disallowed char '${c}' (${c.codePointAt(0).toString(16)})`);
            }
        }
    }
});
(0, node_test_1.default)("renderBigLine returns GLYPH_H rows with correct width", () => {
    const rows = (0, bitfont_js_1.renderBigLine)("AB");
    node_assert_1.default.strictEqual(rows.length, bitfont_js_1.GLYPH_H);
    const expectedWidth = 2 * bitfont_js_1.GLYPH_W + 1; // one space between glyphs
    for (const r of rows)
        node_assert_1.default.strictEqual(r.length, expectedWidth);
});
(0, node_test_1.default)("renderBigLine handles missing glyph by substituting space", () => {
    const rows = (0, bitfont_js_1.renderBigLine)("~");
    for (const r of rows)
        node_assert_1.default.match(r, /^ +$/);
});
//# sourceMappingURL=bitfont.test.js.map
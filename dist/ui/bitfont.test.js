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
const bitfont_js_2 = require("./bitfont.js");
(0, node_test_1.default)("renderMiniLine emits 3 terminal rows of half-block glyphs", () => {
    const rows = (0, bitfont_js_2.renderMiniLine)("HI");
    node_assert_1.default.strictEqual(rows.length, 3);
    for (const row of rows)
        node_assert_1.default.ok(row.length > 0);
});
(0, node_test_1.default)("renderTinyLine emits 2 terminal rows of half-block glyphs", () => {
    const rows = (0, bitfont_js_2.renderTinyLine)("HI");
    node_assert_1.default.strictEqual(rows.length, 2);
    for (const row of rows)
        node_assert_1.default.ok(row.length > 0);
});
(0, node_test_1.default)("renderTinyLine width per char is ~4 cols (3 glyph + 1 separator)", () => {
    const one = (0, bitfont_js_2.renderTinyLine)("A")[0].length;
    const two = (0, bitfont_js_2.renderTinyLine)("AB")[0].length;
    const three = (0, bitfont_js_2.renderTinyLine)("ABC")[0].length;
    node_assert_1.default.strictEqual(one, 3);
    node_assert_1.default.strictEqual(two, 3 + 1 + 3);
    node_assert_1.default.strictEqual(three, 3 + 1 + 3 + 1 + 3);
});
(0, node_test_1.default)("compressToHalfBlock halves row count", () => {
    const lines = (0, bitfont_js_1.renderBigLine)("HI");
    node_assert_1.default.strictEqual(lines.length, 8);
    const compressed = (0, bitfont_js_2.compressToHalfBlock)(lines);
    node_assert_1.default.strictEqual(compressed.length, 4);
});
(0, node_test_1.default)("compressToHalfBlock uses ▀▄█ and space only", () => {
    const compressed = (0, bitfont_js_2.compressToHalfBlock)((0, bitfont_js_1.renderBigLine)("ABC"));
    for (const line of compressed) {
        for (const ch of line) {
            node_assert_1.default.ok(ch === "\u2580" || ch === "\u2584" || ch === "\u2588" || ch === " ", `unexpected char ${JSON.stringify(ch)} in compressed output`);
        }
    }
});
(0, node_test_1.default)("compressToHalfBlock preserves width", () => {
    const wide = (0, bitfont_js_1.renderBigLine)("HELLO");
    const compressed = (0, bitfont_js_2.compressToHalfBlock)(wide);
    node_assert_1.default.strictEqual(compressed[0].length, wide[0].length);
});
(0, node_test_1.default)("compressToHalfBlock: top-only = ▀, bottom-only = ▄, both = █, neither = space", () => {
    const input = ["\u2588  \u2588", "   \u2588"];
    const out = (0, bitfont_js_2.compressToHalfBlock)(input);
    node_assert_1.default.strictEqual(out.length, 1);
    node_assert_1.default.strictEqual(out[0], "\u2580  \u2588");
});
//# sourceMappingURL=bitfont.test.js.map
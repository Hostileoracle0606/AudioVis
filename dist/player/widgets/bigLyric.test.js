"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const renderer_js_1 = require("../../ui/renderer.js");
const bigLyric_js_1 = require("./bigLyric.js");
const theme_js_1 = require("../theme.js");
(0, node_test_1.default)("wrapLyric word-wraps at whitespace without overflowing maxChars", () => {
    const lines = (0, bigLyric_js_1.wrapLyric)("CAUSE I'VE BEEN FAKING", 13);
    for (const l of lines)
        node_assert_1.default.ok(l.length <= 13, `line too long: "${l}" (${l.length})`);
    node_assert_1.default.strictEqual(lines.join(" "), "CAUSE I'VE BEEN FAKING");
});
(0, node_test_1.default)("wrapLyric hard-breaks words that exceed maxChars", () => {
    const lines = (0, bigLyric_js_1.wrapLyric)("ANTIDISESTABLISHMENTARIAN", 6);
    for (const l of lines)
        node_assert_1.default.ok(l.length <= 6);
    node_assert_1.default.strictEqual(lines.join(""), "ANTIDISESTABLISHMENTARIAN");
});
(0, node_test_1.default)("wrapLyric returns [] for maxChars <= 0", () => {
    node_assert_1.default.deepStrictEqual((0, bigLyric_js_1.wrapLyric)("anything", 0), []);
});
(0, node_test_1.default)("renderBigLyric writes 4 half-block rows at region.y + 1", () => {
    const r = new renderer_js_1.Renderer(80, 10);
    (0, bigLyric_js_1.renderBigLyric)(r, { x: 0, y: 1, width: 80, height: 6 }, { text: "HI", bright: false }, (0, theme_js_1.buildTheme)(0, true));
    const lines = r.debugLines();
    for (let y = 2; y <= 5; y++) {
        const content = lines[y].trim();
        node_assert_1.default.ok(content.length > 0, `row ${y} should have glyph content`);
    }
});
(0, node_test_1.default)("renderBigLyric uses accent color by default, accentBright when bright", () => {
    const theme = (0, theme_js_1.buildTheme)(0, false);
    const r1 = new renderer_js_1.Renderer(80, 10);
    (0, bigLyric_js_1.renderBigLyric)(r1, { x: 0, y: 0, width: 80, height: 6 }, { text: "A", bright: false }, theme);
    const r2 = new renderer_js_1.Renderer(80, 10);
    (0, bigLyric_js_1.renderBigLyric)(r2, { x: 0, y: 0, width: 80, height: 6 }, { text: "A", bright: true }, theme);
    const raw1 = r1.cells.join("");
    const raw2 = r2.cells.join("");
    node_assert_1.default.ok(raw1.includes(theme.accent), "expected accent SGR in default render");
    node_assert_1.default.ok(raw2.includes(theme.accentBright), "expected accentBright SGR in bright render");
});
(0, node_test_1.default)("renderBigLyric writes a leading ● marker at region.x", () => {
    const r = new renderer_js_1.Renderer(80, 10);
    (0, bigLyric_js_1.renderBigLyric)(r, { x: 2, y: 0, width: 78, height: 6 }, { text: "X", bright: false }, (0, theme_js_1.buildTheme)(0, true));
    const lines = r.debugLines();
    node_assert_1.default.ok(lines[2].includes("\u25CF"), "expected ● marker on mid row");
});
(0, node_test_1.default)("renderBigLyric clips to region width (no overflow into neighbor cells)", () => {
    const r = new renderer_js_1.Renderer(20, 10);
    (0, bigLyric_js_1.renderBigLyric)(r, { x: 0, y: 0, width: 20, height: 6 }, { text: "HELLO", bright: false }, (0, theme_js_1.buildTheme)(0, true));
    const lines = r.debugLines();
    for (const line of lines) {
        node_assert_1.default.ok(line.length === 20, `line length ${line.length} !== 20`);
    }
});
(0, node_test_1.default)("renderBigLyric word-wraps long lyric into stacked rows when vertical room allows", () => {
    const r = new renderer_js_1.Renderer(120, 14);
    // region ~100 cols → maxChars ~ floor(97/7) = 13. Two-word phrase wraps to ≥2 lines.
    (0, bigLyric_js_1.renderBigLyric)(r, { x: 0, y: 0, width: 100, height: 12 }, { text: "CAUSE I'VE BEEN FAKING", bright: false }, (0, theme_js_1.buildTheme)(0, true));
    const lines = r.debugLines();
    const glyphRowCount = lines.filter((row) => /[\u2580\u2584\u2588]/.test(row)).length;
    // A single bitfont line = 4 compressed rows. Wrapped multi-line must exceed 4.
    node_assert_1.default.ok(glyphRowCount > 4, `expected >4 rows of glyphs, got ${glyphRowCount}`);
});
(0, node_test_1.default)("renderBigLyric does not write past a narrow sub-region into neighbor cells", () => {
    // Renderer is wider than region; nothing should appear at/after x = region.x + region.width.
    const cols = 80;
    const r = new renderer_js_1.Renderer(cols, 10);
    const regionW = 30;
    (0, bigLyric_js_1.renderBigLyric)(r, { x: 0, y: 1, width: regionW, height: 6 }, { text: "HERE AIN'T A THING", bright: false }, (0, theme_js_1.buildTheme)(0, true));
    const lines = r.debugLines();
    for (let y = 0; y < lines.length; y++) {
        const rightSide = lines[y].slice(regionW);
        node_assert_1.default.strictEqual(rightSide.trim(), "", `row ${y}: glyphs leaked past region boundary: "${rightSide}"`);
    }
});
//# sourceMappingURL=bigLyric.test.js.map
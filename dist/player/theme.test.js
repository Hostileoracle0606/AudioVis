"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const theme_js_1 = require("./theme.js");
(0, node_test_1.default)("theme exposes accentBright distinct from accent", () => {
    const t = (0, theme_js_1.buildTheme)(0, false);
    node_assert_1.default.ok(t.accentBright.length > 0);
    node_assert_1.default.notStrictEqual(t.accentBright, t.accent);
});
(0, node_test_1.default)("noColor theme has empty accentBright", () => {
    const t = (0, theme_js_1.buildTheme)(0, true);
    node_assert_1.default.strictEqual(t.accentBright, "");
});
(0, node_test_1.default)("all palettes produce a valid accentBright", () => {
    for (let i = 0; i < theme_js_1.PALETTE_COUNT; i++) {
        const t = (0, theme_js_1.buildTheme)(i, false);
        node_assert_1.default.ok(t.accentBright.length > 0, `palette ${i} missing accentBright`);
    }
});
//# sourceMappingURL=theme.test.js.map
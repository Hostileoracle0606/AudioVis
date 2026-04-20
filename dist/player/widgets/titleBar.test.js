"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const renderer_js_1 = require("../../ui/renderer.js");
const titleBar_js_1 = require("./titleBar.js");
const state_js_1 = require("../state.js");
const theme_js_1 = require("../theme.js");
const layout_js_1 = require("../layout.js");
(0, node_test_1.default)("titleBar renders brand, search placeholder, and SYS.LOAD", () => {
    const r = new renderer_js_1.Renderer(120, 40);
    const s = (0, state_js_1.createInitialState)(120, 40);
    s.cpuPct = 1.2;
    const t = (0, theme_js_1.buildTheme)(0, true);
    const L = (0, layout_js_1.computeAppLayout)(120, 40);
    (0, titleBar_js_1.renderTitleBar)(r, L, s, t);
    const line = r.debugLines()[L.titleBar.y];
    node_assert_1.default.ok(line.includes("[ TUI.AMP v4.0 ]"), "expected brand");
    node_assert_1.default.ok(line.includes("SYS.LOAD:"), "expected SYS.LOAD label");
    node_assert_1.default.ok(line.includes("1.2%"), "expected cpu value");
});
(0, node_test_1.default)("titleBar shows search query when focused", () => {
    const r = new renderer_js_1.Renderer(120, 40);
    const s = (0, state_js_1.createInitialState)(120, 40);
    s.search.focused = true;
    s.search.query = "justice";
    const L = (0, layout_js_1.computeAppLayout)(120, 40);
    (0, titleBar_js_1.renderTitleBar)(r, L, s, (0, theme_js_1.buildTheme)(0, true));
    const line = r.debugLines()[L.titleBar.y];
    node_assert_1.default.ok(line.includes("justice"));
    node_assert_1.default.ok(line.includes(">"), "expected search prompt marker");
});
//# sourceMappingURL=titleBar.test.js.map
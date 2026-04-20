"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const renderer_js_1 = require("../../ui/renderer.js");
const albumArt_js_1 = require("./albumArt.js");
const state_js_1 = require("../state.js");
const theme_js_1 = require("../theme.js");
(0, node_test_1.default)("albumArt shows label in blank mode", () => {
    const r = new renderer_js_1.Renderer(40, 10);
    const s = (0, state_js_1.createInitialState)(40, 10);
    s.artCellMode = "blank";
    (0, albumArt_js_1.renderAlbumArt)(r, { x: 0, y: 0, width: 40, height: 10 }, s, (0, theme_js_1.buildTheme)(0, true));
    node_assert_1.default.ok(r.debugLines().join("\n").includes("ALBUM ART"));
});
(0, node_test_1.default)("albumArt renders provided AsciiArt lines in art mode", () => {
    const r = new renderer_js_1.Renderer(40, 10);
    const s = (0, state_js_1.createInitialState)(40, 10);
    s.artCellMode = "art";
    s.albumArt = {
        trackId: "x", thumbnail: [], lines: ["AAAAA", "BBBBB"],
        fullCols: 5, fullRows: 2, playerLines: [], playerCols: 0, playerRows: 0,
        cols: 40, rows: 10,
    };
    (0, albumArt_js_1.renderAlbumArt)(r, { x: 0, y: 0, width: 40, height: 10 }, s, (0, theme_js_1.buildTheme)(0, true));
    const lines = r.debugLines();
    node_assert_1.default.ok(lines.some((l) => l.includes("AAAAA")));
    node_assert_1.default.ok(lines.some((l) => l.includes("BBBBB")));
});
//# sourceMappingURL=albumArt.test.js.map
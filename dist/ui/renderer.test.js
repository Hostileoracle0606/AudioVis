"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const renderer_js_1 = require("./renderer.js");
(0, node_test_1.default)("Renderer keeps ANSI-styled cells atomic", () => {
    const renderer = new renderer_js_1.Renderer(3, 1);
    renderer.writeCell(0, 0, "\x1b[31mA\x1b[0m");
    renderer.writeCell(1, 0, "\x1b[32mB\x1b[0m");
    renderer.writeCell(2, 0, "C");
    strict_1.default.equal(renderer.toFrameString(), "\x1b[H\x1b[31mA\x1b[0m\x1b[32mB\x1b[0mC");
});
(0, node_test_1.default)("Renderer writes plain text by Unicode code point", () => {
    const renderer = new renderer_js_1.Renderer(5, 1);
    renderer.write(0, 0, "A\u{10437}CD");
    strict_1.default.equal(renderer.toFrameString(), "\x1b[HA\u{10437}CD ");
});
//# sourceMappingURL=renderer.test.js.map
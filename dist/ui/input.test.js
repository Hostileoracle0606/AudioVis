"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const input_js_1 = require("./input.js");
function collect(mode, keys) {
    const out = [];
    for (const k of keys)
        (0, input_js_1.dispatchKey)(() => mode, (e) => out.push(e), k);
    return out;
}
(0, node_test_1.default)("hotkey mode: 'p' emits toggle_play", () => {
    const ev = collect("hotkey", [{ name: "p" }]);
    node_assert_1.default.deepStrictEqual(ev, [{ kind: "hotkey", action: "toggle_play" }]);
});
(0, node_test_1.default)("hotkey mode: '/' is now unmapped (search removed from the UI)", () => {
    const ev = collect("hotkey", [{ name: "/" }]);
    node_assert_1.default.deepStrictEqual(ev, []);
});
(0, node_test_1.default)("text mode: 'p' emits text event (not a hotkey)", () => {
    const ev = collect("text", [{ name: "p", sequence: "p" }]);
    node_assert_1.default.deepStrictEqual(ev, [{ kind: "text", char: "p" }]);
});
(0, node_test_1.default)("text mode: backspace emits edit", () => {
    const ev = collect("text", [{ name: "backspace" }]);
    node_assert_1.default.deepStrictEqual(ev, [{ kind: "edit", op: "backspace" }]);
});
(0, node_test_1.default)("text mode: up/down emit nav", () => {
    const ev = collect("text", [{ name: "up" }, { name: "down" }]);
    node_assert_1.default.deepStrictEqual(ev, [
        { kind: "nav", dir: "up" },
        { kind: "nav", dir: "down" },
    ]);
});
(0, node_test_1.default)("ctrl-c always emits quit regardless of mode", () => {
    const h = collect("hotkey", [{ name: "c", ctrl: true }]);
    const t = collect("text", [{ name: "c", ctrl: true }]);
    node_assert_1.default.deepStrictEqual(h, [{ kind: "quit" }]);
    node_assert_1.default.deepStrictEqual(t, [{ kind: "quit" }]);
});
//# sourceMappingURL=input.test.js.map
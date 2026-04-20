"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const renderer_js_1 = require("./renderer.js");
function captureStdout(fn) {
    const orig = process.stdout.write.bind(process.stdout);
    let buf = "";
    process.stdout.write = (s) => {
        buf += s;
        return true;
    };
    try {
        fn();
    }
    finally {
        process.stdout.write = orig;
    }
    return buf;
}
(0, node_test_1.default)("flushDirty writes nothing when frame is unchanged", () => {
    const r = new renderer_js_1.Renderer(10, 3);
    r.write(0, 0, "hello");
    r.flush(); // prime
    const out = captureStdout(() => r.flushDirty());
    node_assert_1.default.strictEqual(out, "");
});
(0, node_test_1.default)("flushDirty writes only the changed row with cursor positioning", () => {
    const r = new renderer_js_1.Renderer(10, 3);
    r.write(0, 0, "hello");
    r.write(0, 1, "world");
    r.flush();
    r.write(0, 1, "WORLD");
    const out = captureStdout(() => r.flushDirty());
    node_assert_1.default.match(out, /\x1b\[2;1H/); // cursor to row 2
    node_assert_1.default.match(out, /WORLD/);
    node_assert_1.default.ok(!out.includes("hello")); // row 1 not re-emitted
});
(0, node_test_1.default)("invalidate forces next flushDirty to resend everything", () => {
    const r = new renderer_js_1.Renderer(4, 2);
    r.write(0, 0, "abcd");
    r.flush();
    r.invalidate();
    const out = captureStdout(() => r.flushDirty());
    node_assert_1.default.match(out, /\x1b\[1;1H/);
    node_assert_1.default.match(out, /abcd/);
});
//# sourceMappingURL=renderer.test.js.map
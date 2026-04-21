"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const node_assert_1 = __importDefault(require("node:assert"));
const converter_js_1 = require("./converter.js");
const jimp_1 = __importDefault(require("jimp"));
(0, node_test_1.default)("convertToAscii produces a 16-byte padFingerprint", async () => {
    const img = await jimp_1.default.create(8, 8, 0xFF8800FF);
    const buf = await img.getBufferAsync(jimp_1.default.MIME_PNG);
    const art = await (0, converter_js_1.convertToAscii)(buf, "t1", 20, 6, false);
    node_assert_1.default.ok(art.padFingerprint instanceof Uint8Array);
    node_assert_1.default.strictEqual(art.padFingerprint.length, 16);
});
(0, node_test_1.default)("padFingerprint bits are 0 or 1", async () => {
    const img = await jimp_1.default.create(8, 8, 0xFF8800FF);
    const buf = await img.getBufferAsync(jimp_1.default.MIME_PNG);
    const art = await (0, converter_js_1.convertToAscii)(buf, "t1", 20, 6, false);
    for (const bit of art.padFingerprint) {
        node_assert_1.default.ok(bit === 0 || bit === 1, `bit ${bit} is not 0/1`);
    }
});
(0, node_test_1.default)("padFingerprint is deterministic for same input", async () => {
    const img = await jimp_1.default.create(8, 8, 0x808080FF);
    const buf = await img.getBufferAsync(jimp_1.default.MIME_PNG);
    const a = await (0, converter_js_1.convertToAscii)(buf, "x", 20, 6, false);
    const b = await (0, converter_js_1.convertToAscii)(buf, "x", 20, 6, false);
    node_assert_1.default.deepStrictEqual(Array.from(a.padFingerprint), Array.from(b.padFingerprint));
});
//# sourceMappingURL=converter.test.js.map
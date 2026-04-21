import test from "node:test";
import assert from "node:assert";
import { convertToAscii } from "./converter.js";
import Jimp from "jimp";

test("convertToAscii produces a 16-byte padFingerprint", async () => {
  const img = await Jimp.create(8, 8, 0xFF8800FF);
  const buf = await img.getBufferAsync(Jimp.MIME_PNG);
  const art = await convertToAscii(buf, "t1", 20, 6, false);
  assert.ok(art.padFingerprint instanceof Uint8Array);
  assert.strictEqual(art.padFingerprint.length, 16);
});

test("padFingerprint bits are 0 or 1", async () => {
  const img = await Jimp.create(8, 8, 0xFF8800FF);
  const buf = await img.getBufferAsync(Jimp.MIME_PNG);
  const art = await convertToAscii(buf, "t1", 20, 6, false);
  for (const bit of art.padFingerprint) {
    assert.ok(bit === 0 || bit === 1, `bit ${bit} is not 0/1`);
  }
});

test("padFingerprint is deterministic for same input", async () => {
  const img = await Jimp.create(8, 8, 0x808080FF);
  const buf = await img.getBufferAsync(Jimp.MIME_PNG);
  const a = await convertToAscii(buf, "x", 20, 6, false);
  const b = await convertToAscii(buf, "x", 20, 6, false);
  assert.deepStrictEqual(Array.from(a.padFingerprint), Array.from(b.padFingerprint));
});

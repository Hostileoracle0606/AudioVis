import test from "node:test";
import assert from "node:assert";
import { Renderer } from "./renderer.js";

function captureStdout(fn: () => void): string {
  const orig = process.stdout.write.bind(process.stdout);
  let buf = "";
  (process.stdout as unknown as { write: (s: string) => boolean }).write = (s: string) => {
    buf += s;
    return true;
  };
  try { fn(); } finally {
    (process.stdout as unknown as { write: typeof orig }).write = orig;
  }
  return buf;
}

test("flushDirty writes nothing when frame is unchanged", () => {
  const r = new Renderer(10, 3);
  r.write(0, 0, "hello");
  r.flush();                              // prime
  const out = captureStdout(() => r.flushDirty());
  assert.strictEqual(out, "");
});

test("flushDirty writes only the changed row with cursor positioning", () => {
  const r = new Renderer(10, 3);
  r.write(0, 0, "hello");
  r.write(0, 1, "world");
  r.flush();
  r.write(0, 1, "WORLD");
  const out = captureStdout(() => r.flushDirty());
  assert.match(out, /\x1b\[2;1H/);        // cursor to row 2
  assert.match(out, /WORLD/);
  assert.ok(!out.includes("hello"));       // row 1 not re-emitted
});

test("invalidate forces next flushDirty to resend everything", () => {
  const r = new Renderer(4, 2);
  r.write(0, 0, "abcd");
  r.flush();
  r.invalidate();
  const out = captureStdout(() => r.flushDirty());
  assert.match(out, /\x1b\[1;1H/);
  assert.match(out, /abcd/);
});

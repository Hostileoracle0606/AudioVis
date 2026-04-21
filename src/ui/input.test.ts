import test from "node:test";
import assert from "node:assert";
import { dispatchKey, type InputEvent } from "./input.js";

function collect(mode: "hotkey" | "text", keys: Array<{ name?: string; sequence?: string; ctrl?: boolean }>): InputEvent[] {
  const out: InputEvent[] = [];
  for (const k of keys) dispatchKey(() => mode, (e) => out.push(e), k);
  return out;
}

test("hotkey mode: 'p' emits toggle_play", () => {
  const ev = collect("hotkey", [{ name: "p" }]);
  assert.deepStrictEqual(ev, [{ kind: "hotkey", action: "toggle_play" }]);
});

test("hotkey mode: '/' is now unmapped (search removed from the UI)", () => {
  const ev = collect("hotkey", [{ name: "/" }]);
  assert.deepStrictEqual(ev, []);
});

test("text mode: 'p' emits text event (not a hotkey)", () => {
  const ev = collect("text", [{ name: "p", sequence: "p" }]);
  assert.deepStrictEqual(ev, [{ kind: "text", char: "p" }]);
});

test("text mode: backspace emits edit", () => {
  const ev = collect("text", [{ name: "backspace" }]);
  assert.deepStrictEqual(ev, [{ kind: "edit", op: "backspace" }]);
});

test("text mode: up/down emit nav", () => {
  const ev = collect("text", [{ name: "up" }, { name: "down" }]);
  assert.deepStrictEqual(ev, [
    { kind: "nav", dir: "up" },
    { kind: "nav", dir: "down" },
  ]);
});

test("ctrl-c always emits quit regardless of mode", () => {
  const h = collect("hotkey", [{ name: "c", ctrl: true }]);
  const t = collect("text", [{ name: "c", ctrl: true }]);
  assert.deepStrictEqual(h, [{ kind: "quit" }]);
  assert.deepStrictEqual(t, [{ kind: "quit" }]);
});

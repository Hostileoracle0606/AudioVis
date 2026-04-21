import readline from "readline";

export type HotkeyAction =
  | "quit"
  | "toggle_play"
  | "next"
  | "prev"
  | "mute"
  | "cycle_palette"
  | "toggle_art";

export type InputEvent =
  | { kind: "hotkey"; action: HotkeyAction }
  | { kind: "play_pad"; slot: number }
  | { kind: "text"; char: string }
  | { kind: "edit"; op: "backspace" | "enter" | "escape" }
  | { kind: "nav"; dir: "up" | "down" | "left" | "right" }
  | { kind: "quit" };

export type InputMode = "hotkey" | "text";

type Key = { name?: string; sequence?: string; ctrl?: boolean };

const HOTKEYS: Record<string, HotkeyAction> = {
  "q":  "quit",
  "p":  "toggle_play",
  "n":  "next",
  "b":  "prev",
  "m":  "mute",
  "v":  "cycle_palette",
  "a":  "toggle_art",
};

export function dispatchKey(
  getMode: () => InputMode,
  emit: (e: InputEvent) => void,
  key: Key,
): void {
  if (key.ctrl && key.name === "c") { emit({ kind: "quit" }); return; }
  const mode = getMode();
  if (mode === "hotkey") {
    const name = key.name ?? key.sequence ?? "";
    if (name.length === 1 && name >= "1" && name <= "8") {
      emit({ kind: "play_pad", slot: parseInt(name, 10) - 1 });
      return;
    }
    const act = HOTKEYS[name];
    if (act) emit({ kind: "hotkey", action: act });
    return;
  }
  switch (key.name) {
    case "backspace": emit({ kind: "edit", op: "backspace" }); return;
    case "return":    emit({ kind: "edit", op: "enter" }); return;
    case "escape":    emit({ kind: "edit", op: "escape" }); return;
    case "up":        emit({ kind: "nav", dir: "up" }); return;
    case "down":      emit({ kind: "nav", dir: "down" }); return;
    case "left":      emit({ kind: "nav", dir: "left" }); return;
    case "right":     emit({ kind: "nav", dir: "right" }); return;
  }
  const ch = key.sequence && key.sequence.length === 1 ? key.sequence : "";
  if (ch && ch >= " " && ch <= "~") emit({ kind: "text", char: ch });
}

let _installed = false;

export function startInput(
  getMode: () => InputMode,
  emit: (e: InputEvent) => void,
): void {
  if (_installed) return;
  _installed = true;
  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) process.stdin.setRawMode(true);
  process.stdin.on("keypress", (_s: string, key: Key) => dispatchKey(getMode, emit, key));
}

export function stopInput(): void {
  if (!_installed) return;
  _installed = false;
  if (process.stdin.isTTY) process.stdin.setRawMode(false);
  process.stdin.removeAllListeners("keypress");
}

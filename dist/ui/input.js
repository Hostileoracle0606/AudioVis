"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dispatchKey = dispatchKey;
exports.startInput = startInput;
exports.stopInput = stopInput;
const readline_1 = __importDefault(require("readline"));
const HOTKEYS = {
    "q": "quit",
    "p": "toggle_play",
    "n": "next",
    "b": "prev",
    "m": "mute",
    "v": "cycle_palette",
    "a": "toggle_art",
    "/": "focus_search",
};
function dispatchKey(getMode, emit, key) {
    if (key.ctrl && key.name === "c") {
        emit({ kind: "quit" });
        return;
    }
    const mode = getMode();
    if (mode === "hotkey") {
        const name = key.name ?? key.sequence ?? "";
        const act = HOTKEYS[name];
        if (act)
            emit({ kind: "hotkey", action: act });
        return;
    }
    switch (key.name) {
        case "backspace":
            emit({ kind: "edit", op: "backspace" });
            return;
        case "return":
            emit({ kind: "edit", op: "enter" });
            return;
        case "escape":
            emit({ kind: "edit", op: "escape" });
            return;
        case "up":
            emit({ kind: "nav", dir: "up" });
            return;
        case "down":
            emit({ kind: "nav", dir: "down" });
            return;
        case "left":
            emit({ kind: "nav", dir: "left" });
            return;
        case "right":
            emit({ kind: "nav", dir: "right" });
            return;
    }
    const ch = key.sequence && key.sequence.length === 1 ? key.sequence : "";
    if (ch && ch >= " " && ch <= "~")
        emit({ kind: "text", char: ch });
}
let _installed = false;
function startInput(getMode, emit) {
    if (_installed)
        return;
    _installed = true;
    readline_1.default.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY)
        process.stdin.setRawMode(true);
    process.stdin.on("keypress", (_s, key) => dispatchKey(getMode, emit, key));
}
function stopInput() {
    if (!_installed)
        return;
    _installed = false;
    if (process.stdin.isTTY)
        process.stdin.setRawMode(false);
    process.stdin.removeAllListeners("keypress");
}
//# sourceMappingURL=input.js.map
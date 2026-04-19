"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startInput = startInput;
exports.stopInput = stopInput;
const readline_1 = __importDefault(require("readline"));
let _handler = null;
let _rawMode = false;
/**
 * Enable raw key input and mouse reporting, register an action handler.
 */
function startInput(handler) {
    _handler = handler;
    if (!_rawMode) {
        readline_1.default.emitKeypressEvents(process.stdin);
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(true);
        }
        _rawMode = true;
    }
    // Enable X10 mouse click reporting (button press only, no motion)
    process.stdout.write("\x1b[?1000h");
    process.stdin.on("keypress", handleKeypress);
    process.stdin.on("data", handleData);
}
function stopInput() {
    process.stdout.write("\x1b[?1000l"); // disable mouse reporting
    process.stdin.removeListener("keypress", handleKeypress);
    process.stdin.removeListener("data", handleData);
    if (_rawMode && process.stdin.isTTY) {
        process.stdin.setRawMode(false);
        _rawMode = false;
    }
    _handler = null;
}
function handleKeypress(_chunk, key) {
    if (!_handler)
        return;
    if (key.ctrl && key.name === "c") {
        _handler("quit");
        return;
    }
    switch (key.name ?? _chunk) {
        case "q":
            _handler("quit");
            break;
        case "space":
            _handler("toggle_play");
            break;
        case "n":
            _handler("next");
            break;
        case "p":
            _handler("prev");
            break;
        case "s":
            _handler("switch_mode");
            break;
        case "r":
            _handler("refresh");
            break;
        case "a":
            _handler("toggle_album_art");
            break;
        case "escape":
            _handler("toggle_album_art");
            break;
        case "[":
            _handler("cycle_background_prev");
            break;
        case "]":
            _handler("cycle_background_next");
            break;
    }
}
/**
 * Parse raw stdin bytes for ANSI mouse sequences.
 * X10 format: ESC [ M <cb> <cx> <cy>
 *   cb = button byte: cb & 3 === 0 → left button press
 *   cx, cy = 1-based column and row (offset by 32)
 */
function handleData(data) {
    if (!_handler)
        return;
    if (data.length < 6)
        return;
    if (data[0] !== 0x1b || data[1] !== 0x5b || data[2] !== 0x4d)
        return; // ESC [ M
    const cb = data[3] - 32;
    const col = data[4] - 32 - 1; // convert to 0-based
    const row = data[5] - 32 - 1; // convert to 0-based
    const isLeftPress = (cb & 3) === 0;
    const isHeaderRow = row === 0 || row === 1;
    if (isLeftPress && isHeaderRow) {
        _handler("toggle_album_art");
    }
}
//# sourceMappingURL=input.js.map
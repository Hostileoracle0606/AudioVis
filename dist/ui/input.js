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
 * Enable raw key input and register an action handler.
 * Only one handler is active at a time.
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
    process.stdin.on("keypress", handleKeypress);
}
function stopInput() {
    process.stdin.removeListener("keypress", handleKeypress);
    if (_rawMode && process.stdin.isTTY) {
        process.stdin.setRawMode(false);
        _rawMode = false;
    }
    _handler = null;
}
function handleKeypress(_chunk, key) {
    if (!_handler)
        return;
    // Ctrl-C
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
    }
}
//# sourceMappingURL=input.js.map
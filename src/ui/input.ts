import readline from "readline";

export type Action =
  | "quit"
  | "toggle_play"
  | "next"
  | "prev"
  | "switch_mode"
  | "refresh";

type ActionHandler = (action: Action) => void;

let _handler: ActionHandler | null = null;
let _rawMode = false;

/**
 * Enable raw key input and register an action handler.
 * Only one handler is active at a time.
 */
export function startInput(handler: ActionHandler): void {
  _handler = handler;

  if (!_rawMode) {
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }
    _rawMode = true;
  }

  process.stdin.on("keypress", handleKeypress);
}

export function stopInput(): void {
  process.stdin.removeListener("keypress", handleKeypress);
  if (_rawMode && process.stdin.isTTY) {
    process.stdin.setRawMode(false);
    _rawMode = false;
  }
  _handler = null;
}

function handleKeypress(
  _chunk: string,
  key: { name?: string; ctrl?: boolean; sequence?: string }
): void {
  if (!_handler) return;

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

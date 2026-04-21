export type HotkeyAction = "quit" | "toggle_play" | "next" | "prev" | "mute" | "cycle_palette" | "toggle_art" | "focus_search";
export type InputEvent = {
    kind: "hotkey";
    action: HotkeyAction;
} | {
    kind: "text";
    char: string;
} | {
    kind: "edit";
    op: "backspace" | "enter" | "escape";
} | {
    kind: "nav";
    dir: "up" | "down" | "left" | "right";
} | {
    kind: "quit";
};
export type InputMode = "hotkey" | "text";
type Key = {
    name?: string;
    sequence?: string;
    ctrl?: boolean;
};
export declare function dispatchKey(getMode: () => InputMode, emit: (e: InputEvent) => void, key: Key): void;
export declare function startInput(getMode: () => InputMode, emit: (e: InputEvent) => void): void;
export declare function stopInput(): void;
export {};
//# sourceMappingURL=input.d.ts.map
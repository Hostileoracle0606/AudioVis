export type Action = "quit" | "toggle_play" | "next" | "prev" | "switch_mode" | "refresh" | "toggle_album_art";
type ActionHandler = (action: Action) => void;
/**
 * Enable raw key input and mouse reporting, register an action handler.
 */
export declare function startInput(handler: ActionHandler): void;
export declare function stopInput(): void;
export {};
//# sourceMappingURL=input.d.ts.map
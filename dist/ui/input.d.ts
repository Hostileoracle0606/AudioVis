export type Action = "quit" | "toggle_play" | "next" | "prev" | "switch_mode" | "refresh";
type ActionHandler = (action: Action) => void;
/**
 * Enable raw key input and register an action handler.
 * Only one handler is active at a time.
 */
export declare function startInput(handler: ActionHandler): void;
export declare function stopInput(): void;
export {};
//# sourceMappingURL=input.d.ts.map
/**
 * AppScreen manages the alternate terminal screen buffer.
 * Entering the alternate screen hides existing terminal content;
 * exiting restores it exactly as it was.
 */
export declare function enterAlternateScreen(): void;
export declare function exitAlternateScreen(): void;
export declare function getTerminalSize(): {
    cols: number;
    rows: number;
};
//# sourceMappingURL=AppScreen.d.ts.map
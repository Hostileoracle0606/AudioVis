export interface Region {
    x: number;
    y: number;
    width: number;
    height: number;
}
export interface AppLayout {
    header: Region;
    progress: Region;
    visualizer: Region;
    footer: Region;
}
export declare function computeLayout(cols: number, rows: number): AppLayout;
export interface PlayerLayout {
    /** The dim background plate (the whole viz region). */
    background: Region;
    /** Record-player chassis (left pane). */
    chassis: Region;
    /** Lyrics + waveform side module (right pane). */
    side: Region;
    /** Centred floating search frame. */
    search: Region;
    /** If true, terminal is too narrow — caller should fall back to legacy mode. */
    collapsed: boolean;
}
/**
 * Compose the three player-mode panes inside a given viz region.
 * At widths < 110 cols the side module stacks below the chassis;
 * below 80 cols the caller should fall back to legacy rendering.
 */
export declare function computePlayerLayout(viz: Region): PlayerLayout;
export declare function isTooSmall(cols: number, rows: number): boolean;
export declare function tooSmallMessage(cols: number, rows: number): string;
//# sourceMappingURL=layout.d.ts.map
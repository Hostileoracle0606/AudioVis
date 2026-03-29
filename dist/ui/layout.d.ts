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
export declare function isTooSmall(cols: number, rows: number): boolean;
export declare function tooSmallMessage(cols: number, rows: number): string;
//# sourceMappingURL=layout.d.ts.map
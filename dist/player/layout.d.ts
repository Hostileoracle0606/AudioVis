import type { Region } from "../ui/tui.js";
export declare const MIN_COLS = 108;
export declare const MIN_ROWS = 28;
export interface AppLayout {
    outer: Region;
    inner: Region;
    titleBar: Region;
    brandR: Region;
    searchR: Region;
    sysLoadR: Region;
    sep1Y: number;
    sep1Down: number[];
    topRow: Region;
    screenR: Region;
    nowR: Region;
    padsR: Region;
    sep2Y: number;
    sep2Up: number[];
    sep2Down: number[];
    middleRow: Region;
    lyricsR: Region;
    spectrumR: Region;
    sep3Y: number;
    sep3Up: number[];
    bottomRow: Region;
    scrubR: Region;
    keysR: Region;
    tooSmall: boolean;
}
export declare function computeAppLayout(cols: number, rows: number): AppLayout;
//# sourceMappingURL=layout.d.ts.map
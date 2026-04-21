export interface Theme {
    fg: string;
    dim: string;
    border: string;
    accent: string;
    spectrum: string[];
    meter: string;
    reset: string;
}
export declare const PALETTE_COUNT: number;
export declare function buildTheme(paletteIndex: number, noColor: boolean): Theme;
//# sourceMappingURL=theme.d.ts.map
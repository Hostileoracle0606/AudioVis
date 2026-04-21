export interface Theme {
    fg: string;
    dim: string;
    border: string;
    accent: string;
    accentBright: string;
    spectrum: string[];
    meter: string;
    reset: string;
}
export declare const PALETTE_COUNT: number;
export declare const BLINK_PERIOD_MS = 1800;
export declare const BLINK_DUTY = 0.6;
/** True when the blink is in its on-phase at `nowMs`. */
export declare function blinkOn(nowMs: number): boolean;
/** Theme-aware on-air colour: bright accent when on, dim when off. */
export declare function blinkColor(theme: Theme, nowMs: number): string;
export declare function buildTheme(paletteIndex: number, noColor: boolean): Theme;
//# sourceMappingURL=theme.d.ts.map
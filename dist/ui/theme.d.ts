/**
 * Character palettes and minimal ANSI styling.
 *
 * By default the app renders in monochrome. An optional dim green tint
 * is applied when color is enabled (the classic terminal green aesthetic).
 */
export interface Theme {
    palette: string[];
    colorEnabled: boolean;
    dim: string;
    normal: string;
    bright: string;
    reset: string;
}
/** ASCII-safe character ramp from sparse to dense. */
export declare const ASCII_PALETTE: string[];
/** Unicode block character ramp from sparse to dense. */
export declare const UNICODE_PALETTE: string[];
export declare const BAR_FULL = "\u2588";
export declare const BAR_UPPER = "\u2584";
export declare function buildTheme(ascii: boolean, color: boolean): Theme;
/** Return the character in the palette for a normalised density in [0, 1]. */
export declare function densityChar(density: number, theme: Theme): string;
//# sourceMappingURL=theme.d.ts.map
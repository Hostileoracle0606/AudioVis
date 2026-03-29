/**
 * Character palettes and minimal ANSI styling.
 *
 * By default the app renders in monochrome. An optional dim green tint
 * is applied when color is enabled (the classic terminal green aesthetic).
 */

export interface Theme {
  palette: string[];
  colorEnabled: boolean;
  // ANSI escape sequences
  dim: string;
  normal: string;
  bright: string;
  reset: string;
}

/** ASCII-safe character ramp from sparse to dense. */
export const ASCII_PALETTE = [" ", ".", ":", ";", "x", "+", "=", "%", "#", "@"];

/** Unicode block character ramp from sparse to dense. */
export const UNICODE_PALETTE = [" ", "\u2591", "\u2592", "\u2593", "\u2588"];

// Wave character used for spectrum bar blocks
export const BAR_FULL = "\u2588";
export const BAR_UPPER = "\u2584";

export function buildTheme(ascii: boolean, color: boolean): Theme {
  return {
    palette: ascii ? ASCII_PALETTE : UNICODE_PALETTE,
    colorEnabled: color,
    dim: color ? "\x1b[2;32m" : "\x1b[2m",
    normal: color ? "\x1b[0;32m" : "\x1b[0m",
    bright: color ? "\x1b[1;32m" : "\x1b[1m",
    reset: "\x1b[0m",
  };
}

/** Return the character in the palette for a normalised density in [0, 1]. */
export function densityChar(density: number, theme: Theme): string {
  const idx = Math.floor(density * (theme.palette.length - 1));
  return theme.palette[Math.max(0, Math.min(theme.palette.length - 1, idx))];
}

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

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp01(s);
  const light = clamp01(l);
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = light - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;
  if (hue < 60) [r, g, b] = [c, x, 0];
  else if (hue < 120) [r, g, b] = [x, c, 0];
  else if (hue < 180) [r, g, b] = [0, c, x];
  else if (hue < 240) [r, g, b] = [0, x, c];
  else if (hue < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

function ansiColor(rgb: [number, number, number], weight: 2 | 22 | 1): string {
  const [r, g, b] = rgb;
  return `\x1b[${weight};38;2;${r};${g};${b}m`;
}

export function buildTheme(
  ascii: boolean,
  color: boolean,
  style?: StyleProfile
): Theme {
  const hue = style?.hue ?? 120;
  const saturation = style?.saturation ?? 0.55;
  const brightness = style?.brightness ?? 0.5;
  const darkness = style?.darkness ?? 0.3;
  const dimRgb = hslToRgb(hue, saturation * 0.55, 0.22 + brightness * 0.16 - darkness * 0.08);
  const normalRgb = hslToRgb(hue, saturation * 0.8, 0.4 + brightness * 0.18 - darkness * 0.06);
  const brightRgb = hslToRgb(hue, saturation, 0.58 + brightness * 0.18 - darkness * 0.04);

  return {
    palette: ascii ? ASCII_PALETTE : UNICODE_PALETTE,
    colorEnabled: color,
    dim: color ? ansiColor(dimRgb, 2) : "\x1b[2m",
    normal: color ? ansiColor(normalRgb, 22) : "\x1b[0m",
    bright: color ? ansiColor(brightRgb, 1) : "\x1b[1m",
    reset: "\x1b[0m",
  };
}

/** Return the character in the palette for a normalised density in [0, 1]. */
export function densityChar(density: number, theme: Theme): string {
  const idx = Math.floor(density * (theme.palette.length - 1));
  return theme.palette[Math.max(0, Math.min(theme.palette.length - 1, idx))];
}
import type { StyleProfile } from "../spotify/styleProfile.js";

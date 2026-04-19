export interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AppLayout {
  header: Region;    // track title + device (2 lines)
  progress: Region;  // progress bar (1 line)
  visualizer: Region; // the large central viz area
  footer: Region;    // hotkey row (1 line)
}

const MIN_WIDTH = 60;
const MIN_HEIGHT = 14;

export function computeLayout(cols: number, rows: number): AppLayout {
  // Header: 2 lines (title + state)
  // Progress: 1 line
  // Separator: 1 line (blank)
  // Footer: 1 line
  // Remaining rows → visualizer
  const HEADER_H = 2;
  const PROGRESS_H = 1;
  const SEP_H = 1;
  const FOOTER_H = 1;

  const vizTop = HEADER_H + PROGRESS_H + SEP_H;
  const vizHeight = Math.max(1, rows - vizTop - FOOTER_H - 1);

  return {
    header: { x: 0, y: 0, width: cols, height: HEADER_H },
    progress: { x: 0, y: HEADER_H, width: cols, height: PROGRESS_H },
    visualizer: { x: 0, y: vizTop, width: cols, height: vizHeight },
    footer: { x: 0, y: rows - 1, width: cols, height: FOOTER_H },
  };
}

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
export function computePlayerLayout(viz: Region): PlayerLayout {
  const { x, y, width: W, height: H } = viz;
  const collapsed = W < 70 || H < 14;

  const searchW = Math.max(28, Math.min(48, Math.floor(W * 0.45)));
  const searchH = 3;
  const searchX = x + Math.max(0, Math.floor((W - searchW) / 2));
  const searchY = y;
  const search: Region = { x: searchX, y: searchY, width: searchW, height: searchH };

  // Space below search reserved for chassis + side.
  const panesY = y + searchH + 1;
  const panesH = Math.max(1, H - searchH - 1);

  if (W >= 110) {
    const chassisW = Math.floor(W * 0.58);
    const sideW = W - chassisW - 1;
    return {
      background: viz,
      chassis: { x, y: panesY, width: chassisW, height: panesH },
      side:    { x: x + chassisW + 1, y: panesY, width: sideW, height: panesH },
      search,
      collapsed,
    };
  }

  // Narrow: stack chassis above side.
  const chassisH = Math.floor(panesH * 0.66);
  const sideH = Math.max(1, panesH - chassisH - 1);
  return {
    background: viz,
    chassis: { x, y: panesY, width: W, height: chassisH },
    side:    { x, y: panesY + chassisH + 1, width: W, height: sideH },
    search,
    collapsed,
  };
}

export function isTooSmall(cols: number, rows: number): boolean {
  return cols < MIN_WIDTH || rows < MIN_HEIGHT;
}

export function tooSmallMessage(cols: number, rows: number): string {
  return `Terminal too small: ${cols}x${rows} (minimum ${MIN_WIDTH}x${MIN_HEIGHT})`;
}

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

export function isTooSmall(cols: number, rows: number): boolean {
  return cols < MIN_WIDTH || rows < MIN_HEIGHT;
}

export function tooSmallMessage(cols: number, rows: number): string {
  return `Terminal too small: ${cols}x${rows} (minimum ${MIN_WIDTH}x${MIN_HEIGHT})`;
}

/**
 * Frame-buffer based terminal renderer.
 *
 * Maintains a 2D grid of characters (cols × rows).
 * Writes strings into specific positions, then flushes
 * the entire frame as a single write() call.
 *
 * Uses cursor-home (ESC[H) instead of clear each frame
 * to reduce flicker.
 */

export class Renderer {
  private cols: number;
  private rows: number;
  private cells: string[];
  private prevLines: string[] = [];

  constructor(cols: number, rows: number) {
    this.cols = cols;
    this.rows = rows;
    this.cells = new Array(cols * rows).fill(" ");
  }

  resize(cols: number, rows: number): void {
    this.cols = cols;
    this.rows = rows;
    this.cells = new Array(cols * rows).fill(" ");
    this.prevLines = [];
  }

  /** Fill the entire buffer with spaces. */
  clear(): void {
    this.cells.fill(" ");
  }

  /**
   * Write a string starting at column x, row y.
   * ANSI SGR escapes (\x1b[...m) are treated as zero-width and bound to the
   * following visible char in the same cell, so a write advances by VISIBLE
   * columns rather than raw string length. Trailing escapes (e.g. a reset)
   * attach to the last visible char written. This keeps writes atomic per
   * cell so subsequent writes can't clobber partial escape sequences.
   * Characters that fall outside the buffer are silently clipped.
   */
  write(x: number, y: number, text: string): void {
    if (y < 0 || y >= this.rows) return;
    let i = 0;
    let cx = x;
    let pending = "";
    let lastCx = -1;
    const n = text.length;
    while (i < n) {
      if (text.charCodeAt(i) === 0x1b && i + 1 < n && text[i + 1] === "[") {
        let j = i + 2;
        while (j < n) {
          const ch = text.charCodeAt(j);
          if ((ch >= 0x40 && ch <= 0x7e)) { j++; break; }
          j++;
        }
        pending += text.slice(i, j);
        i = j;
        continue;
      }
      if (cx >= 0 && cx < this.cols) {
        this.cells[y * this.cols + cx] = pending + text[i];
        lastCx = cx;
      }
      pending = "";
      cx++;
      i++;
    }
    if (pending && lastCx >= 0) {
      this.cells[y * this.cols + lastCx] += pending;
    }
  }

  /**
   * Write a string centered horizontally at row y.
   */
  writeCenter(y: number, text: string): void {
    const x = Math.max(0, Math.floor((this.cols - visibleLength(text)) / 2));
    this.write(x, y, text);
  }

  /**
   * Write text right-aligned ending at column `rightEdge` on row y.
   */
  writeRight(y: number, text: string, rightEdge?: number): void {
    const edge = rightEdge ?? this.cols - 1;
    const x = edge - visibleLength(text) + 1;
    this.write(x, y, text);
  }

  /**
   * Build the full frame string and write it to stdout in one call.
   * Moves cursor to top-left first (no full clear = less flicker).
   */
  private buildLines(): string[] {
    const out: string[] = [];
    for (let row = 0; row < this.rows; row++) {
      out.push(
        this.cells.slice(row * this.cols, row * this.cols + this.cols).join("")
      );
    }
    return out;
  }

  /**
   * Full-frame flush: positions cursor at top-left and emits every row.
   * Use on first paint, after resize, and after `invalidate()`.
   */
  flush(): void {
    const lines = this.buildLines();
    process.stdout.write("\x1b[H" + lines.join("\n"));
    this.prevLines = lines;
  }

  /**
   * Per-row dirty flush: emits only rows that differ from the previous frame,
   * each prefixed with `ESC[<r>;1H\x1b[0m` so the cursor jumps to the row and
   * SGR state is reset. One `stdout.write` call total → terminals draw atomically.
   */
  flushDirty(): void {
    const lines = this.buildLines();
    let out = "";
    for (let row = 0; row < this.rows; row++) {
      if (lines[row] !== this.prevLines[row]) {
        out += `\x1b[${row + 1};1H\x1b[0m${lines[row]}`;
      }
    }
    if (out) process.stdout.write(out);
    this.prevLines = lines;
  }

  /** Drop the cached previous frame so the next `flushDirty` resends everything. */
  invalidate(): void {
    this.prevLines = [];
  }

  /** Test-only: return current cell buffer rows with SGR stripped. */
  debugLines(): string[] {
    const out: string[] = [];
    for (let row = 0; row < this.rows; row++) {
      const raw = this.cells
        .slice(row * this.cols, row * this.cols + this.cols)
        .join("");
      out.push(raw.replace(/\x1b\[[0-9;]*m/g, ""));
    }
    return out;
  }

  get width(): number {
    return this.cols;
  }

  get height(): number {
    return this.rows;
  }
}

/**
 * Return the visible (printable) length of a string,
 * stripping ANSI escape sequences.
 */
function visibleLength(s: string): number {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b\[[0-9;]*m/g, "").length;
}

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
export declare class Renderer {
    private cols;
    private rows;
    private cells;
    private prevLines;
    constructor(cols: number, rows: number);
    resize(cols: number, rows: number): void;
    /** Fill the entire buffer with spaces. */
    clear(): void;
    /**
     * Write a string starting at column x, row y.
     * ANSI SGR escapes (\x1b[...m) are treated as zero-width and bound to the
     * following visible char in the same cell, so a write advances by VISIBLE
     * columns rather than raw string length. Trailing escapes (e.g. a reset)
     * attach to the last visible char written. This keeps writes atomic per
     * cell so subsequent writes can't clobber partial escape sequences.
     * Characters that fall outside the buffer are silently clipped.
     */
    write(x: number, y: number, text: string): void;
    /**
     * Write a string centered horizontally at row y.
     */
    writeCenter(y: number, text: string): void;
    /**
     * Write text right-aligned ending at column `rightEdge` on row y.
     */
    writeRight(y: number, text: string, rightEdge?: number): void;
    /**
     * Build the full frame string and write it to stdout in one call.
     * Moves cursor to top-left first (no full clear = less flicker).
     */
    private buildLines;
    /**
     * Full-frame flush: positions cursor at top-left and emits every row.
     * Use on first paint, after resize, and after `invalidate()`.
     */
    flush(): void;
    /**
     * Per-row dirty flush: emits only rows that differ from the previous frame,
     * each prefixed with `ESC[<r>;1H\x1b[0m` so the cursor jumps to the row and
     * SGR state is reset. One `stdout.write` call total → terminals draw atomically.
     */
    flushDirty(): void;
    /** Drop the cached previous frame so the next `flushDirty` resends everything. */
    invalidate(): void;
    /** Test-only: return current cell buffer rows with SGR stripped. */
    debugLines(): string[];
    get width(): number;
    get height(): number;
}
//# sourceMappingURL=renderer.d.ts.map
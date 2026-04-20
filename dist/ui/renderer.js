"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Renderer = void 0;
class Renderer {
    cols;
    rows;
    cells;
    constructor(cols, rows) {
        this.cols = cols;
        this.rows = rows;
        this.cells = new Array(cols * rows).fill(" ");
    }
    resize(cols, rows) {
        this.cols = cols;
        this.rows = rows;
        this.cells = new Array(cols * rows).fill(" ");
    }
    /** Fill the entire buffer with spaces. */
    clear() {
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
    write(x, y, text) {
        if (y < 0 || y >= this.rows)
            return;
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
                    if ((ch >= 0x40 && ch <= 0x7e)) {
                        j++;
                        break;
                    }
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
    writeCenter(y, text) {
        const x = Math.max(0, Math.floor((this.cols - visibleLength(text)) / 2));
        this.write(x, y, text);
    }
    /**
     * Write text right-aligned ending at column `rightEdge` on row y.
     */
    writeRight(y, text, rightEdge) {
        const edge = rightEdge ?? this.cols - 1;
        const x = edge - visibleLength(text) + 1;
        this.write(x, y, text);
    }
    /**
     * Build the full frame string and write it to stdout in one call.
     * Moves cursor to top-left first (no full clear = less flicker).
     */
    flush() {
        const lines = [];
        for (let row = 0; row < this.rows; row++) {
            lines.push(this.cells.slice(row * this.cols, row * this.cols + this.cols).join(""));
        }
        // ESC[H = cursor home (top-left), no screen clear
        process.stdout.write("\x1b[H" + lines.join("\n"));
    }
    /** Test-only: return current cell buffer rows with SGR stripped. */
    debugLines() {
        const out = [];
        for (let row = 0; row < this.rows; row++) {
            const raw = this.cells
                .slice(row * this.cols, row * this.cols + this.cols)
                .join("");
            out.push(raw.replace(/\x1b\[[0-9;]*m/g, ""));
        }
        return out;
    }
    get width() {
        return this.cols;
    }
    get height() {
        return this.rows;
    }
}
exports.Renderer = Renderer;
/**
 * Return the visible (printable) length of a string,
 * stripping ANSI escape sequences.
 */
function visibleLength(s) {
    // eslint-disable-next-line no-control-regex
    return s.replace(/\x1b\[[0-9;]*m/g, "").length;
}
//# sourceMappingURL=renderer.js.map
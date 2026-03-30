export interface AsciiArt {
    trackId: string;
    /** 2 rows × 4 cols thumbnail for the header icon. Each string is one row. */
    thumbnail: string[];
    /** Full-size art — one string per row, with ANSI 256-color codes. */
    lines: string[];
    /** Terminal dimensions at conversion time — stale-check on resize. */
    cols: number;
    rows: number;
}
/**
 * Convert a raw image buffer to an AsciiArt object.
 *
 * @param buffer   Raw JPEG/PNG bytes
 * @param trackId  Spotify track ID (stored for cache keying)
 * @param vizCols  Width of the visualizer region in terminal columns
 * @param vizRows  Height of the visualizer region in terminal rows
 * @param noColor  If true, emit plain ASCII without ANSI color codes
 */
export declare function convertToAscii(buffer: Buffer, trackId: string, vizCols: number, vizRows: number, noColor: boolean): Promise<AsciiArt>;
//# sourceMappingURL=converter.d.ts.map
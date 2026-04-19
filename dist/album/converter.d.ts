export interface AsciiArt {
    trackId: string;
    /** 2 rows × 4 cols thumbnail for the header icon. */
    thumbnail: string[];
    /** Fullscreen album-art-mode lines (ANSI truecolor half-blocks). */
    lines: string[];
    fullCols: number;
    fullRows: number;
    /** Player-mode screen-panel lines at a smaller target size. */
    playerLines: string[];
    playerCols: number;
    playerRows: number;
    /** Terminal dimensions at conversion time — stale-check on resize. */
    cols: number;
    rows: number;
}
/**
 * Convert a raw image buffer to an AsciiArt object, using the ansilize
 * half-block truecolor renderer.  Produces two renderings:
 *   - `lines` at album-art-mode size (~48% of viz width)
 *   - `playerLines` at player-mode screen-panel size
 */
export declare function convertToAscii(buffer: Buffer, trackId: string, vizCols: number, vizRows: number, noColor: boolean): Promise<AsciiArt>;
//# sourceMappingURL=converter.d.ts.map
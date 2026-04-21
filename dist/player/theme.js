"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PALETTE_COUNT = void 0;
exports.buildTheme = buildTheme;
const SGR = (n) => `\x1b[${n}m`;
const FG256 = (n) => SGR(`38;5;${n}`);
const PALETTE_WARM = [208, 208, 214, 214, 220, 220, 226, 226, 220, 220, 214, 214, 208, 208, 202, 202];
const PALETTE_TEAL = [37, 37, 43, 43, 49, 49, 79, 79, 49, 49, 43, 43, 37, 37, 30, 30];
const PALETTE_MAGENTA = [161, 161, 162, 162, 165, 165, 171, 171, 165, 165, 162, 162, 161, 161, 125, 125];
const PALETTE_MONO = new Array(16).fill(250);
const PALETTES = [PALETTE_WARM, PALETTE_TEAL, PALETTE_MAGENTA, PALETTE_MONO];
exports.PALETTE_COUNT = PALETTES.length;
function buildTheme(paletteIndex, noColor) {
    if (noColor) {
        return {
            fg: "", dim: "", border: "", accent: "", meter: "", reset: "",
            spectrum: new Array(16).fill(""),
        };
    }
    const palette = PALETTES[paletteIndex % PALETTES.length];
    return {
        fg: FG256(253),
        dim: FG256(244),
        border: FG256(240),
        accent: FG256(208),
        meter: FG256(palette[8]),
        reset: SGR("0"),
        spectrum: palette.map((n) => FG256(n)),
    };
}
//# sourceMappingURL=theme.js.map
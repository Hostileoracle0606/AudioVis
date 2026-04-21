"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderNowPlaying = renderNowPlaying;
exports.stepScope = stepScope;
const trackDna_js_1 = require("../trackDna.js");
const theme_js_1 = require("../theme.js");
const bitfont_js_1 = require("../../ui/bitfont.js");
// DNA element palette — 256-color indices chosen so each field reads as
// its own "LED" on an imagined mixer strip. Kept here so the widget
// renders deterministically even if the global theme rotates.
const SGR = (n) => `\x1b[38;5;${n}m`;
const COLOUR = {
    bpm: SGR(220), // bright yellow
    key: SGR(49), // teal/cyan
    lufs: SGR(250), // dim grey (informational)
    eng: SGR(202), // red-orange (intensity)
    val: SGR(220), // yellow (mood)
    dan: SGR(201), // magenta (groove)
    aco: SGR(81), // light teal (texture)
    label: SGR(244), // neutral grey for three-letter labels
    // Sampler-panel LEDs — reuse of the same palette so the whole strip
    // feels like one coherent hardware module.
    pitch: SGR(220),
    swing: SGR(201),
    loop: SGR(202),
    bank: SGR(49),
    slot: SGR(220),
    quant: SGR(81),
};
function gauge(value, width, color, theme) {
    const fill = Math.round((value / 100) * width);
    let out = "";
    for (let i = 0; i < width; i++)
        out += i < fill ? "\u25AE" : "\u25AF";
    return `${color}${out}${theme.reset}`;
}
/**
 * Render a single-line marquee with progressive bitfont shrink — never
 * falls back to plain text.
 *   1. Try `renderMiniLine` (3 rows × 7 cols/char incl. separator). If
 *      the text fits at that size, use it.
 *   2. Otherwise try `renderTinyLine` (2 rows × 4 cols/char). If the
 *      text fits, use it.
 *   3. Otherwise truncate the text to the largest tiny-bitfont prefix
 *      that fits (with a trailing `..` in tiny bitfont) and render that.
 *
 * Returns the number of rows actually drawn so the caller can position
 * the next element against the largest possible height (mini = 3 rows).
 */
function drawMiniMarquee(r, x, y, text, maxCols, color, theme) {
    if (text.length === 0 || maxCols <= 0)
        return 0;
    // Widths per char: mini = GLYPH_W + 1 separator, tiny = 3 + 1 separator.
    // Char count that fits width W at stride S:  floor((W + 1) / S).
    const miniCharFit = Math.max(0, Math.floor((maxCols + 1) / (bitfont_js_1.GLYPH_W + 1)));
    if (text.length <= miniCharFit) {
        const rows = (0, bitfont_js_1.renderMiniLine)(text);
        for (let i = 0; i < rows.length; i++) {
            const line = rows[i].length > maxCols ? rows[i].slice(0, maxCols) : rows[i];
            r.write(x, y + i, `${color}${line}${theme.reset}`);
        }
        return rows.length;
    }
    const tinyStride = 4; // 3 cols glyph + 1 col separator
    const tinyCharFit = Math.max(0, Math.floor((maxCols + 1) / tinyStride));
    let body = text;
    if (body.length > tinyCharFit) {
        // Reserve 2 chars for the ".." ellipsis glyphs at the end.
        const headLen = Math.max(0, tinyCharFit - 2);
        body = text.slice(0, headLen).replace(/\s+$/, "") + "..";
    }
    const rows = (0, bitfont_js_1.renderTinyLine)(body);
    // Center vertically in the 3-row mini-marquee band so tiny and mini
    // baselines align when they occupy the same y coordinate.
    const bandH = 3;
    const offsetY = Math.max(0, Math.floor((bandH - rows.length) / 2));
    for (let i = 0; i < rows.length; i++) {
        const line = rows[i].length > maxCols ? rows[i].slice(0, maxCols) : rows[i];
        r.write(x, y + offsetY + i, `${color}${line}${theme.reset}`);
    }
    return bandH;
}
function dnaInfoLine(dna, theme) {
    return (`${COLOUR.label}bpm ${COLOUR.bpm}${String(dna.bpm).padStart(3, " ")}${theme.reset}` +
        `  ${COLOUR.label}key ${COLOUR.key}${dna.key}${dna.keyMode === "min" ? "m" : " "}${theme.reset}` +
        `  ${COLOUR.label}lufs ${COLOUR.lufs}${String(dna.lufs).padStart(3, " ")}${theme.reset}`);
}
function dotRule(label, width, theme) {
    const inner = ` ${label} `;
    const dashes = Math.max(0, width - inner.length);
    const left = Math.floor(dashes / 2);
    const right = dashes - left;
    return `${theme.dim}${"\u00B7".repeat(left)}${inner}${"\u00B7".repeat(right)}${theme.reset}`;
}
function renderNowPlaying(r, region, state, theme) {
    if (region.width < 24 || region.height < 12)
        return;
    const xi = region.x + 2;
    const pad = region.width - 4;
    const np = state.nowPlaying;
    const cat = np ? (0, trackDna_js_1.catalogNumber)(`${np.trackName}|${np.artistName}`) : "000";
    // Tally-light blink — shared cadence with `● peak-hold` so the two
    // indicators pulse in unison. Only blinks while a track is loaded so
    // the idle UI stays calm.
    const hdrColor = np ? (0, theme_js_1.blinkColor)(theme, Date.now()) : theme.dim;
    r.write(xi, region.y, `${hdrColor}[ now \u00B7 track ${cat} ]${theme.reset}`);
    if (!np) {
        r.write(xi, region.y + 2, `${theme.dim}\u2014 no track \u2014${theme.reset}`);
        return;
    }
    // Marquee: track name in bright accent (glowing), artist in regular
    // accent (dimmer tier). Each mini bitfont line is 3 terminal rows.
    drawMiniMarquee(r, xi, region.y + 1, np.trackName, pad, theme.accentBright, theme);
    drawMiniMarquee(r, xi, region.y + 5, np.artistName, pad, theme.accent, theme);
    const dna = (0, trackDna_js_1.computeDna)(`${np.trackName}|${np.artistName}`);
    // Split the lower half into two columns: DNA on the left, amp-chassis
    // knob panel on the right. The DNA column holds its width regardless
    // of region size; the sampler column only renders when there's enough
    // room for a chassis + knobs.
    const DNA_W = 36;
    const gap = 2;
    const minSamplerW = 14; // chassis walls + enough bars to read
    const hasSampler = pad >= DNA_W + gap + minSamplerW;
    const samplerX = xi + DNA_W + gap;
    const samplerW = hasSampler ? pad - DNA_W - gap : 0;
    // Wrap the DNA block in a heavy-line chassis so the section reads as
    // a cohesive module — matches the amp/scope chassis on the right.
    drawAmpChassis(r, xi, region.y + 9, DNA_W, 5, "track dna", theme);
    // DNA rows sit inside the chassis with a left-padding of 2 cols, so
    // values visually align past the heavy ┃ wall rather than hugging it.
    const dnaX = xi + 2;
    const dnaW = DNA_W - 4; // inner content width
    const gaugeW = 6;
    // Column positions for the 2-column gauge rows. Left col starts at
    // dnaX, right col starts at the midpoint of the inner width so the
    // eng/val and dan/aco pairs line up vertically.
    const rightColX = dnaX + Math.floor(dnaW / 2);
    // Row 1: bpm | key | lufs — triple column with consistent spacing.
    const col1 = `${COLOUR.label}bpm${theme.reset} ${COLOUR.bpm}${String(dna.bpm).padStart(3, " ")}${theme.reset}`;
    const col2 = `${COLOUR.label}key${theme.reset} ${COLOUR.key}${dna.key}${dna.keyMode === "min" ? "m" : " "}${theme.reset}`;
    const col3 = `${COLOUR.label}lufs${theme.reset} ${COLOUR.lufs}${String(dna.lufs).padStart(3, " ")}${theme.reset}`;
    r.write(dnaX, region.y + 10, col1);
    r.write(dnaX + 10, region.y + 10, col2);
    r.write(dnaX + 19, region.y + 10, col3);
    // Rows 2-3: paired gauges with a dim `│` divider between columns so
    // the grid structure reads at a glance.
    const divCol = rightColX - 1;
    const divider = `${theme.dim}\u2502${theme.reset}`;
    const gaugeCell = (lbl, val, color) => `${COLOUR.label}${lbl}${theme.reset} ${gauge(val, gaugeW, color, theme)} ${color}${String(val).padStart(2, " ")}${theme.reset}`;
    r.write(dnaX, region.y + 11, gaugeCell("eng", dna.energy, COLOUR.eng));
    r.write(divCol, region.y + 11, divider);
    r.write(rightColX, region.y + 11, gaugeCell("val", dna.valence, COLOUR.val));
    r.write(dnaX, region.y + 12, gaugeCell("dan", dna.danceability, COLOUR.dan));
    r.write(divCol, region.y + 12, divider);
    r.write(rightColX, region.y + 12, gaugeCell("aco", dna.acousticness, COLOUR.aco));
    if (hasSampler) {
        renderCavaPanel(r, samplerX, region.y + 9, samplerW, state, theme);
    }
    // `dotRule` is no longer called from the main path but is retained for
    // the section-header style in case another widget wants to use it.
    void dotRule;
    // Footer dotted baseline — nothing else below.
    const dots = "\u00B7 ".repeat(Math.max(0, Math.floor(pad / 2)));
    r.write(xi, region.y + region.height - 1, `${theme.dim}${dots}${theme.reset}`);
}
// Braille bit map: U+2800 base + a bitmask per (row, col) pixel within
// a 2×4 dot cell. Standard Unicode 8-dot Braille dot numbering:
//   (1) (4)
//   (2) (5)
//   (3) (6)
//   (7) (8)
const BRAILLE_BASE = 0x2800;
const BRAILLE_BITS = [
    [0x01, 0x08], // pixel row 0: left dot 1, right dot 4
    [0x02, 0x10], // pixel row 1: left dot 2, right dot 5
    [0x04, 0x20], // pixel row 2: left dot 3, right dot 6
    [0x40, 0x80], // pixel row 3: left dot 7, right dot 8
];
// Lissajous persistence buffer: a ring of recent (x, y) pixel positions.
// Drawing *all* buffered points each frame produces the classic
// "phosphor trail" look of a CRT phase scope. Integer Int16Array keeps
// the buffer tight and GC-free.
const SCOPE_BUF_LEN = 180;
const scopePts = new Int16Array(SCOPE_BUF_LEN * 2);
let scopeWriteIdx = 0;
let scopeFilled = false;
let scopeLastTs = 0;
/**
 * Advance the Lissajous buffer by a batch of points. Each point is a
 * 2D position `(X, Y)` inside the scope area where:
 *   - X = amp · sin(ωx · t + φx)
 *   - Y = amp · sin(ωy · t + φy)
 *
 * ωx and ωy are deliberately *different* frequencies (ratio driven by
 * the spectral centroid) so the curve visits the whole rectangle —
 * otherwise, with our 5:1 stretched strip aspect, a matched-frequency
 * trace collapses to the centre row. Amplitude tracks RMS (the most
 * reliable "signal present" indicator in the app state) with channel
 * meters biasing the ratio a little so a strong L/R imbalance tilts
 * the figure.
 */
function stepScope(spectrum, rms, meterL, meterR, pxCols, pxRows, nowMs) {
    if (pxCols <= 1 || pxRows <= 1)
        return;
    const cx = (pxCols - 1) / 2;
    const cy = (pxRows - 1) / 2;
    const sx = cx * 0.95; // full-width extent
    const sy = cy * 0.9; // full-height extent
    // Spectral centroid → ωy/ωx ratio. Bass-heavy: 2:1 (simple figure-8);
    // treble-heavy: ~3.3:1 (dense pretzel). Rational-but-shifting makes
    // the curve unfold differently across tracks.
    let weighted = 0;
    let total = 0;
    for (let k = 0; k < spectrum.length; k++) {
        const m = Math.max(0, Math.min(1, spectrum[k] ?? 0));
        weighted += m * k;
        total += m;
    }
    const centroid = total > 0.01 ? weighted / (total * Math.max(1, spectrum.length - 1)) : 0.3;
    const omegaX = 0.014; // X base ang. velocity (rad/ms)
    const omegaY = omegaX * (2.0 + centroid * 1.3); // Y = 2×–3.3× X
    // Phase offsets — nudged by L/R imbalance so the figure "leans" with
    // asymmetric mixes. Small effect, but reads as stereo character.
    const imbalance = meterL - meterR; // -1..+1
    const phaseX = 0;
    const phaseY = Math.PI * 0.25 + imbalance * 0.4;
    // Amplitude: RMS is the most reliable energy signal in state. Use a
    // gentle curve and a visibility floor that's large enough to remain
    // readable even during quiet passages.
    const energy = Math.max(0, Math.min(1, rms + Math.max(meterL, meterR) * 0.3));
    const amp = Math.max(0.35, Math.min(1, Math.pow(energy, 0.55) + 0.15));
    // Emit enough samples per frame to keep the trace continuous.
    const dt = Math.max(1, Math.min(80, nowMs - scopeLastTs));
    scopeLastTs = nowMs;
    const samplesPerFrame = Math.max(10, Math.min(32, Math.round(dt / 3)));
    const timeStep = dt / samplesPerFrame;
    for (let i = 0; i < samplesPerFrame; i++) {
        const t = nowMs - (samplesPerFrame - 1 - i) * timeStep;
        const x = amp * Math.sin(omegaX * t + phaseX);
        const y = amp * Math.sin(omegaY * t + phaseY);
        const px = Math.round(cx + x * sx);
        const py = Math.round(cy - y * sy);
        scopePts[scopeWriteIdx * 2] = px;
        scopePts[scopeWriteIdx * 2 + 1] = py;
        scopeWriteIdx = (scopeWriteIdx + 1) % SCOPE_BUF_LEN;
        if (scopeWriteIdx === 0)
            scopeFilled = true;
    }
}
/**
 * Render the whole persistence buffer to Braille. Every lit pixel is
 * bit-OR'd into the grid — overlapping recent points naturally produce
 * denser Braille glyphs on the "bright" part of the trace, giving the
 * phosphor-decay look without per-pixel brightness.
 */
function drawDotMatrixScope(r, x, y, width, height, color, theme) {
    const pxCols = width * 2;
    const pxRows = height * 4;
    const grid = [];
    for (let row = 0; row < height; row++)
        grid.push(new Uint16Array(width));
    const lit = (px, py) => {
        if (py < 0 || py >= pxRows || px < 0 || px >= pxCols)
            return;
        const col = px >> 1;
        const pCol = px & 1;
        const row = py >> 2;
        const pRow = py & 3;
        grid[row][col] |= BRAILLE_BITS[pRow][pCol];
    };
    const end = scopeFilled ? SCOPE_BUF_LEN : scopeWriteIdx;
    for (let i = 0; i < end; i++) {
        const px = scopePts[i * 2];
        const py = scopePts[i * 2 + 1];
        lit(px, py);
    }
    // Dim cross-hair at centre so the axes are visible when the trace is
    // clustered on one side. Only on empty cells to avoid dimming the
    // actual phosphor glyphs.
    const midTermRow = Math.floor(height / 2);
    const midTermCol = Math.floor(width / 2);
    for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
            const bits = grid[row][col];
            if (bits === 0) {
                const onCrosshair = row === midTermRow || col === midTermCol;
                if (onCrosshair)
                    r.write(x + col, y + row, `${theme.dim}\u00B7${theme.reset}`);
                else
                    r.write(x + col, y + row, " ");
            }
            else {
                r.write(x + col, y + row, `${color}${String.fromCharCode(BRAILLE_BASE + bits)}${theme.reset}`);
            }
        }
    }
}
/** Guitar-amp chassis: heavy-line border with a centred title. */
function drawAmpChassis(r, x, y, w, h, title, theme) {
    const inner = Math.max(0, w - 2);
    const label = ` ${title} `;
    const leftDash = Math.max(0, Math.floor((inner - label.length) / 2));
    const rightDash = Math.max(0, inner - label.length - leftDash);
    r.write(x, y, `${theme.dim}\u250F${"\u2501".repeat(leftDash)}${label}${"\u2501".repeat(rightDash)}\u2513${theme.reset}`);
    for (let i = 1; i < h - 1; i++) {
        r.write(x, y + i, `${theme.dim}\u2503${theme.reset}`);
        r.write(x + w - 1, y + i, `${theme.dim}\u2503${theme.reset}`);
    }
    r.write(x, y + h - 1, `${theme.dim}\u2517${"\u2501".repeat(inner)}\u251B${theme.reset}`);
}
/**
 * Audio-reactive waveform panel: heavy-line amp chassis with a centred
 * time-domain trace inside. The trace scrolls right-to-left; latest audio
 * appears at the right edge. Uses a module-level rolling buffer so the
 * scroll persists between frames independently of the app state.
 */
function renderCavaPanel(r, x, y, width, state, theme) {
    drawAmpChassis(r, x, y, width, 5, "scope", theme);
    const interiorX = x + 2;
    const interiorY = y + 1;
    const interiorW = Math.max(0, width - 4);
    const interiorH = 3;
    if (interiorW <= 0)
        return;
    // Advance the Lissajous persistence buffer, then draw all buffered
    // points. Braille gives 2× horizontal sub-pixel density, so pixel
    // coordinates are (width × 2) by (height × 4).
    stepScope(state.spectrum, state.rms, state.meterL, state.meterR, interiorW * 2, interiorH * 4, Date.now());
    drawDotMatrixScope(r, interiorX, interiorY, interiorW, interiorH, theme.accent, theme);
}
//# sourceMappingURL=nowPlaying.js.map
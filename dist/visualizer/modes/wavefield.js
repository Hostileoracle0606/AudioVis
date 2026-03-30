"use strict";
/**
 * Wavefield visualizer mode.
 *
 * Rendering modes:
 *   ASCII  — three sinusoidal wave-lines with a distance-to-char ramp.
 *   Braille — full 2-D plasma field rendered at 2×4 dot subpixel resolution.
 *
 * Plasma field formula (four interfering sinusoids):
 *   P(x,y) = ¼·sin(x·fH + t·sH + beatPhase)   ← horizontal, bass-driven
 *           + ¼·sin(y·fV + t·sV)                ← vertical,   mid-driven
 *           + ¼·sin((x+y)·fD + t·sD)            ← diagonal,   treble-driven
 *           + ¼·sin(r·fR − t·sR)                ← radial rings, amp+pulse-driven
 *
 * Multi-band thresholding maps P → flowing "plasma" bands.  All spatial
 * frequencies and speeds are audio-reactive; a hard bass onset spikes the
 * radial speed (rings bloom outward) and widens the bands (screen flares).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderWavefield = renderWavefield;
// ---------------------------------------------------------------------------
// ASCII path — three-wave distance-to-character ramp (unchanged)
// ---------------------------------------------------------------------------
const RAMP = [
    { dist: 0.5, char: "#" },
    { dist: 1.1, char: "x" },
    { dist: 1.8, char: ":" },
    { dist: 2.6, char: "." },
];
function distToChar(dist) {
    for (const r of RAMP) {
        if (dist < r.dist)
            return r.char;
    }
    return " ";
}
// ---------------------------------------------------------------------------
// Braille path — 2D plasma field
// ---------------------------------------------------------------------------
// Unicode braille codepoints: U+2800 + bits
// Dot layout within one character cell (dc = dot-column, dr = dot-row):
//   dc=0  dc=1
//   dr=0   1    4     ← bit 0, bit 3
//   dr=1   2    5     ← bit 1, bit 4
//   dr=2   3    6     ← bit 2, bit 5
//   dr=3   7    8     ← bit 6, bit 7
const BRAILLE_BITS = [
    [0, 1, 2, 6], // dc=0
    [3, 4, 5, 7], // dc=1
];
function renderWavefieldBraille(state, W, H, elapsed, low, mid, high, amplitude, pulse, renderer, region, theme) {
    const TAU = 2 * Math.PI;
    const DOT_W = 2 * W; // total dot columns
    const DOT_H = 4 * H; // total dot rows
    const style = state.styleProfile;
    const frame = state.analysisFrame;
    const segmentBrightness = frame.segment
        ? Math.max(0, Math.min(1, (frame.segment.loudness_max + 30) / 30))
        : 0;
    const tatumKick = 1 - frame.tatumProgress;
    const beatKick = 1 - frame.beatProgress;
    const sectionKick = frame.sectionTransition;
    // ── Spatial frequencies: how many bands fit across the screen ───────────
    // Bass → horizontal wave complexity; treble → diagonal fine detail.
    const fH = 3.0 + low * (3.0 + style.groove * 2.0) + style.density * 1.1;
    const fV = 2.0 + mid * (2.4 + style.organic * 1.2);
    const fD = 1.5 + high * (3.6 + style.glitch * 3.0) + style.metallic * 0.8;
    const fR = 1.2 + amplitude * (1.8 + style.density * 1.5) + style.darkness * 0.8;
    // ── Phase velocities (rad/s) ─────────────────────────────────────────────
    const sH = (0.7 + low * (1.1 + style.groove) + beatKick * style.groove) * TAU;
    const sV = (0.4 + mid * (0.8 + style.organic * 0.8)) * TAU;
    const sD = (1.0 + high * (1.7 + style.glitch * 1.9) + tatumKick * style.glitch * 1.1) * TAU;
    const sR = (1.4 + amplitude * 1.1 + pulse * (3.0 + style.aggression * 2.5) + sectionKick * 2.0) * TAU;
    // ── Beat flash: phase-kick the horizontal wave on each onset ─────────────
    // pulse is a sharp, unsmoothed onset value → creates a brief phase jump
    // that looks like a horizontal "tear" across the plasma — very hyperpop.
    const beatPhase = pulse * Math.PI * (1 + style.glitch * 0.8) + tatumKick * style.glitch * 0.75;
    // ── Multi-band thresholding ───────────────────────────────────────────────
    // numBands: how many full interference bands span [0,1].
    // bandWidth: fraction [0,1] of each band period that's lit (dot density).
    // Both swell with audio energy, making the screen fill and throb.
    const numBands = 3.0 + low * (1.6 + style.density * 1.4) + mid * (0.8 + style.density);
    const bandWidth = 0.42 +
        amplitude * 0.14 +
        pulse * (0.16 + style.aggression * 0.1) +
        style.softness * 0.08 +
        sectionKick * 0.12;
    for (let termCol = 0; termCol < W; termCol++) {
        for (let termRow = 0; termRow < H; termRow++) {
            let bits = 0;
            let topV = 0.0; // highest field value among all lit dots in this cell
            for (let dc = 0; dc < 2; dc++) {
                for (let dr = 0; dr < 4; dr++) {
                    // Normalised position: px, py ∈ [0, 1]; cx, cy ∈ [-0.5, 0.5]
                    const px = (2 * termCol + dc) / DOT_W;
                    const py = (4 * termRow + dr) / DOT_H;
                    const cx = px - 0.5;
                    const cy = py - 0.5;
                    const r = Math.sqrt(cx * cx + cy * cy); // 0 at centre, ~0.71 at corner
                    // Four-component plasma sum.  Each term ∈ [-0.25, 0.25] → sum ∈ [-1, 1].
                    const glitchWarp = style.glitch * 0.06 * Math.sin(py * TAU * (7 + high * 5) + elapsed * sD + tatumKick * 4);
                    const organicDrift = style.organic * 0.05 * Math.sin(px * TAU * 1.4 + elapsed * sV * 0.35);
                    const metallicRing = style.metallic * 0.18 * Math.cos(r * TAU * (3 + segmentBrightness * 2) - elapsed * sR);
                    const plasma = 0.24 * Math.sin((px + glitchWarp) * fH * TAU + elapsed * sH + beatPhase) +
                        0.24 * Math.sin((py + organicDrift) * fV * TAU + elapsed * sV) +
                        0.24 * Math.sin((px + py + glitchWarp) * fD * Math.PI + elapsed * sD) +
                        0.18 * Math.sin(r * fR * TAU * 3.0 - elapsed * sR) +
                        metallicRing;
                    const v = (plasma + 1) * 0.5; // remap to [0, 1]
                    // Multi-band gate: lit if within the lit portion of the current band
                    const bandPhase = (v * numBands) % 1.0;
                    const glitchGate = style.glitch > 0.55 &&
                        ((termCol + termRow + Math.floor(elapsed * 40)) % 11 === 0);
                    if (bandPhase < bandWidth || (glitchGate && v > 0.56 + style.glitch * 0.1)) {
                        bits |= 1 << BRAILLE_BITS[dc][dr];
                        if (v > topV)
                            topV = v;
                    }
                }
            }
            if (bits === 0)
                continue;
            const ch = String.fromCodePoint(0x2800 + bits);
            let cell = ch;
            if (theme.colorEnabled) {
                // Three brightness tiers based on where in [0,1] the peak field value sits.
                // High v = plasma peak (constructive interference) → white-hot.
                // Low v = band edge → dim corona.
                if (topV > 0.72)
                    cell = theme.bright + ch + theme.reset;
                else if (topV > 0.54)
                    cell = theme.normal + ch + theme.reset;
                else
                    cell = theme.dim + ch + theme.reset;
            }
            renderer.write(termCol, region.y + termRow, cell);
        }
    }
}
// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------
function renderWavefield(state, renderer, region, theme) {
    const W = region.width;
    const H = region.height;
    const elapsed = (Date.now() - state.startTime) / 1000;
    const cy = H / 2;
    const style = state.styleProfile;
    // Use the plasma path whenever the terminal supports Unicode.
    // The ASCII path is unchanged for --ascii-safe terminals.
    const useBraille = theme.palette.length <= 5;
    if (useBraille) {
        renderWavefieldBraille(state, W, H, elapsed, state.low, state.mid, state.high, state.amplitude, state.pulse, renderer, region, theme);
        return;
    }
    // ── ASCII path ────────────────────────────────────────────────────────────
    const lowAmp = 0.12 + state.low * (0.22 + style.density * 0.15);
    const midAmp = 0.06 + state.mid * (0.14 + style.organic * 0.12);
    const highAmp = 0.02 + state.high * (0.06 + style.glitch * 0.08);
    const speedLow = 0.28 + state.low * (0.12 + style.groove * 0.18);
    const speedMid = 0.55 + state.mid * (0.15 + style.organic * 0.12);
    const speedHigh = 1.05 + state.high * (0.24 + style.glitch * 0.32);
    const thick1 = 1.8 + state.low * (1.1 + style.density) + state.pulse * (0.5 + style.aggression);
    const thick2 = 1.3 + state.mid * (0.9 + style.organic * 0.8);
    const thick3 = 0.9 + state.high * (0.5 + style.glitch * 1.2);
    for (let col = 0; col < W; col++) {
        const xNorm = col / W;
        const phaseShift = xNorm * 2 * Math.PI;
        const w1 = Math.sin(phaseShift * 2.0 + elapsed * speedLow) * (cy * lowAmp * 2);
        const w2 = Math.sin(phaseShift * 3.5 + elapsed * speedMid + 1.2) * (cy * midAmp * 2) +
            Math.sin(phaseShift * 1.3 + elapsed * speedMid * 0.6) * (cy * midAmp);
        const w3 = Math.sin(phaseShift * 7.0 + elapsed * speedHigh + 2.4) * (cy * highAmp * 2);
        const r1 = cy + w1;
        const r2 = cy * 0.55 + w2;
        const r3 = cy * 1.45 + w3;
        for (let rowOffset = 0; rowOffset < H; rowOffset++) {
            const absRow = region.y + rowOffset;
            const rowF = rowOffset + 0.5;
            const d1 = Math.abs(rowF - r1);
            const d2 = Math.abs(rowF - r2);
            const d3 = Math.abs(rowF - r3);
            const minDist = Math.min(d1 < thick1 ? d1 : Infinity, d2 < thick2 ? d2 : Infinity, d3 < thick3 ? d3 : Infinity);
            if (minDist === Infinity)
                continue;
            const ch = distToChar(minDist);
            if (ch === " ")
                continue;
            const bright = theme.colorEnabled && minDist < 0.5;
            const dim = theme.colorEnabled && minDist > 1.5;
            let cell = ch;
            if (bright)
                cell = theme.bright + ch + theme.reset;
            else if (dim)
                cell = theme.dim + ch + theme.reset;
            else if (theme.colorEnabled)
                cell = theme.normal + ch + theme.reset;
            renderer.write(col, absRow, cell);
        }
    }
}
//# sourceMappingURL=wavefield.js.map
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
function renderWavefieldBraille(W, H, elapsed, low, mid, high, amplitude, pulse, renderer, region, theme, state) {
    const song = state.songTheme;
    const speedMul = song.phaseSpeedMul;
    const freqMul = song.spatialFreqMul;
    const TAU = 2 * Math.PI;
    const DOT_W = 2 * W; // total dot columns
    const DOT_H = 4 * H; // total dot rows
    // ── Spatial frequencies: how many bands fit across the screen ───────────
    // Bass → horizontal wave complexity; treble → diagonal fine detail.
    // All frequencies multiplied by the song's spatialFreqMul so a dense,
    // energetic track gets finer, busier banding.
    const fH = (3.0 + low * 4.0) * freqMul;
    const fV = (2.0 + mid * 3.0) * freqMul;
    const fD = (1.5 + high * 5.0) * freqMul;
    const fR = (1.2 + amplitude * 2.5) * freqMul;
    // ── Phase velocities (rad/s) ─────────────────────────────────────────────
    const sH = (0.8 + low * 1.5) * TAU * speedMul;
    const sV = (0.5 + mid * 0.9) * TAU * speedMul;
    const sD = (1.4 + high * 2.5) * TAU * speedMul;
    const sR = (1.8 + amplitude * 1.2 + pulse * 5.0) * TAU * speedMul;
    // ── Beat flash: phase-kick the horizontal wave on each onset ─────────────
    // pulse is a sharp, unsmoothed onset value → creates a brief phase jump
    // that looks like a horizontal "tear" across the plasma — very hyperpop.
    const beatPhase = pulse * Math.PI;
    // ── Multi-band thresholding ───────────────────────────────────────────────
    // numBands: how many full interference bands span [0,1].
    // bandWidth: fraction [0,1] of each band period that's lit (dot density).
    // Both swell with audio energy, making the screen fill and throb.
    const numBands = 3.5 + low * 2.0 + mid * 1.0;
    const bandWidth = 0.50 + amplitude * 0.18 + pulse * 0.22;
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
                    const plasma = 0.25 * Math.sin(px * fH * TAU + elapsed * sH + beatPhase) +
                        0.25 * Math.sin(py * fV * TAU + elapsed * sV) +
                        0.25 * Math.sin((px + py) * fD * Math.PI + elapsed * sD) +
                        0.25 * Math.sin(r * fR * TAU * 3.0 - elapsed * sR);
                    const v = (plasma + 1) * 0.5; // remap to [0, 1]
                    // Multi-band gate: lit if within the lit portion of the current band
                    const bandPhase = (v * numBands) % 1.0;
                    if (bandPhase < bandWidth) {
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
                // Four brightness tiers using the song-theme colour ramp — accent
                // for constructive-interference peaks, bright for the main body,
                // normal for mid values, dim for band edges.
                if (topV > 0.80)
                    cell = song.accent + ch + song.reset;
                else if (topV > 0.62)
                    cell = song.bright + ch + song.reset;
                else if (topV > 0.48)
                    cell = song.normal + ch + song.reset;
                else
                    cell = song.dim + ch + song.reset;
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
    // Use the plasma path whenever the terminal supports Unicode.
    // The ASCII path is unchanged for --ascii-safe terminals.
    const useBraille = theme.palette.length <= 5;
    if (useBraille) {
        renderWavefieldBraille(W, H, elapsed, state.low, state.mid, state.high, state.amplitude, state.pulse, renderer, region, theme, state);
        // Render multi-ring overlay on top of the plasma too (they read as
        // expanding shockwaves against the field).
        renderBeatRings(state, renderer, region, W, H, theme);
        return;
    }
    // ── ASCII path ────────────────────────────────────────────────────────────
    // Core wave equations evaluate at multiple "past" times to give a motion
    // trail — each wave is drawn at t, t-δ, t-2δ at successively dimmer tiers.
    // This is pure math, no framebuffer state needed.
    const song = state.songTheme;
    const speedMul = song.phaseSpeedMul;
    const extraLayers = song.waveLayerBias; // 0, 1, or 2 extra waves
    const lowAmp = 0.15 + state.low * 0.30;
    const midAmp = 0.07 + state.mid * 0.18;
    const highAmp = 0.03 + state.high * 0.08;
    const xtraAmp = 0.05 + state.mid * 0.15;
    const speedLow = (0.35 + state.low * 0.15) * speedMul;
    const speedMid = (0.70 + state.mid * 0.25) * speedMul;
    const speedHigh = (1.40 + state.high * 0.40) * speedMul;
    const speedXtra = (1.00 + state.amplitude * 0.50) * speedMul;
    const thick1 = 2.0 + state.low * 1.5 + state.pulse * 0.8;
    const thick2 = 1.6 + state.mid * 1.2;
    const thick3 = 1.2 + state.high * 0.8;
    const thickX = 1.0;
    // Trail offsets — three samples at 0, 60ms, 120ms into the past.
    const TRAIL_STEP = 0.06;
    const TRAILS = 3;
    const baseLayers = [
        { center: cy, amp: cy * lowAmp * 2, freq: 2.0, speed: speedLow, phase: 0.0, thick: thick1 },
        { center: cy * 0.55, amp: cy * midAmp * 2, freq: 3.5, speed: speedMid, phase: 1.2, thick: thick2 },
        { center: cy * 1.45, amp: cy * highAmp * 2, freq: 7.0, speed: speedHigh, phase: 2.4, thick: thick3 },
    ];
    // Extra slow wide wave when the song is dynamic / beaty.
    if (extraLayers >= 1) {
        baseLayers.push({ center: cy * 0.3, amp: cy * xtraAmp * 2, freq: 1.1, speed: speedXtra * 0.5, phase: 0.6, thick: thickX + 0.3 });
    }
    // Extra fast fine ripple for very dynamic material.
    if (extraLayers >= 2) {
        baseLayers.push({ center: cy * 1.7, amp: cy * xtraAmp * 1.2, freq: 11.0, speed: speedXtra * 1.3, phase: 3.1, thick: thickX });
    }
    for (let col = 0; col < W; col++) {
        const xNorm = col / W;
        const phaseShift = xNorm * 2 * Math.PI;
        // Walk every (layer, trail-sample) pair and find the closest for this cell.
        for (let rowOffset = 0; rowOffset < H; rowOffset++) {
            const absRow = region.y + rowOffset;
            const rowF = rowOffset + 0.5;
            let bestDist = Infinity;
            let bestTrail = 0;
            for (const L of baseLayers) {
                for (let ti = 0; ti < TRAILS; ti++) {
                    const t = elapsed - ti * TRAIL_STEP;
                    const waveY = L.center + Math.sin(phaseShift * L.freq + t * L.speed + L.phase) * L.amp;
                    const d = Math.abs(rowF - waveY);
                    // Thickness widens slightly on the "head" (ti==0) so the leading
                    // edge reads as denser than the fading trail.
                    const effThick = L.thick * (1 - ti * 0.18);
                    if (d < effThick && d < bestDist) {
                        bestDist = d;
                        bestTrail = ti;
                    }
                }
            }
            if (bestDist === Infinity)
                continue;
            const ch = distToChar(bestDist);
            if (ch === " ")
                continue;
            // Colour tier combines proximity to the wave centre with trail index.
            // Head of the wave gets accent/bright; trail samples step down.
            let cell = ch;
            if (theme.colorEnabled) {
                const isHead = bestTrail === 0;
                if (isHead && bestDist < 0.5)
                    cell = song.accent + ch + song.reset;
                else if (isHead)
                    cell = song.bright + ch + song.reset;
                else if (bestTrail === 1)
                    cell = song.normal + ch + song.reset;
                else
                    cell = song.dim + ch + song.reset;
            }
            renderer.write(col, absRow, cell);
        }
    }
    // Multi-ring overlay (both ASCII and braille paths use this).
    renderBeatRings(state, renderer, region, W, H, theme);
}
/**
 * Render up to N concurrent expanding beat rings from state.ringQueue.
 * Each ring bloom has a fixed ~800ms lifetime and decays from bright
 * accent → dim as its radius grows.  Multiple concurrent rings give
 * the field a sense of *rhythm-history* — you can see the last few beats
 * drifting outward.
 */
function renderBeatRings(state, renderer, region, W, H, theme) {
    const song = state.songTheme;
    const ringLifetime = 0.8;
    const now = Date.now();
    const cx = W / 2;
    const rcy = H / 2;
    const maxR = Math.min(W / 2, H) * 0.95;
    for (const ring of state.ringQueue) {
        const age = (now - ring.ms) / 1000;
        if (age < 0 || age > ringLifetime)
            continue;
        const ringAge = age / ringLifetime;
        const radius = ringAge * maxR * (0.5 + ring.strength * 0.6);
        const thickness = 0.8 + (1 - ringAge) * 0.6;
        // Glyph steps down as the ring ages.
        const primary = song.ringGlyph;
        const glyph = ringAge < 0.35 ? primary : ringAge < 0.7 ? "." : " ";
        if (glyph === " ")
            continue;
        const step = 1 / Math.max(8, radius * 4);
        for (let t = 0; t < 1; t += step) {
            const theta = t * 2 * Math.PI;
            const colF = cx + Math.cos(theta) * radius;
            const rowF = rcy + Math.sin(theta) * radius * 0.5;
            const col = Math.round(colF);
            const rowI = Math.round(rowF);
            if (col < 0 || col >= W || rowI < 0 || rowI >= H)
                continue;
            const dx = colF - col;
            const dy = (rowF - rowI) * 2;
            if (Math.hypot(dx, dy) > thickness * 0.5)
                continue;
            let cell = glyph;
            if (theme.colorEnabled) {
                // Newest rings pop with accent; older rings fade through bright/normal/dim.
                if (ringAge < 0.25)
                    cell = song.accent + glyph + song.reset;
                else if (ringAge < 0.55)
                    cell = song.bright + glyph + song.reset;
                else if (ringAge < 0.8)
                    cell = song.normal + glyph + song.reset;
                else
                    cell = song.dim + glyph + song.reset;
            }
            renderer.write(col, region.y + rowI, cell);
        }
    }
}
//# sourceMappingURL=wavefield.js.map
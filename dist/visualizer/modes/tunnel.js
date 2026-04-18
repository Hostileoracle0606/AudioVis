"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareTunnel = prepareTunnel;
exports.renderTunnel = renderTunnel;
const pitchPalette_js_1 = require("../pitchPalette.js");
function clamp01(value) {
    return Math.max(0, Math.min(1, value));
}
function hashNoise(a, b, c) {
    let value = Math.imul(a + 7, 73856093) ^ Math.imul(b + 13, 19349663) ^ Math.imul(c + 29, 83492791);
    value = (value >>> 0) % 1000;
    return value / 1000;
}
function styleCell(ch, theme, state, intensity) {
    if (!theme.colorEnabled)
        return ch;
    return (0, pitchPalette_js_1.pitchAnsiColor)(state.pitchHue, state.pitchSaturation, intensity) + ch + theme.reset;
}
function createRing(seed) {
    return {
        depth: 0.08,
        phase: hashNoise(seed, 3, 11) * Math.PI * 2,
        skewX: hashNoise(seed, 5, 17) * 2 - 1,
        skewY: hashNoise(seed, 7, 23) * 2 - 1,
    };
}
function getTunnelModeData(state, width, height) {
    const existing = state.modeData.tunnel;
    if (existing && existing.width === width && existing.height === height) {
        return existing;
    }
    const rings = [0, 1, 2, 3].map((seed, index) => ({
        ...createRing(seed + 1),
        depth: 0.14 + index * 0.2,
    }));
    const next = {
        width,
        height,
        rings,
        lastSpawnMs: 0,
    };
    state.modeData.tunnel = next;
    return next;
}
function prepareTunnel(state, region) {
    const data = getTunnelModeData(state, region.width, region.height);
    const nowMs = Date.now() - state.startTime;
    const speed = 0.024 + state.amplitude * 0.04 + state.pulse * 0.065;
    for (const ring of data.rings) {
        ring.depth += speed * (1 + state.low * 0.2);
    }
    data.rings = data.rings.filter((ring) => ring.depth < 1.18);
    const spawnInterval = Math.max(190, 520 - Math.round(state.amplitude * 240));
    const leadDepth = data.rings[0]?.depth ?? 1;
    const shouldSpawn = state.pulse > 0.24 ||
        leadDepth > 0.22 ||
        nowMs - data.lastSpawnMs > spawnInterval;
    if (shouldSpawn) {
        const ring = createRing(Math.floor(nowMs / 37) + data.rings.length);
        data.rings.unshift(ring);
        data.lastSpawnMs = nowMs;
    }
}
function drawRing(renderer, state, theme, region, ring, nowMs) {
    const cx = region.x + Math.floor(region.width / 2);
    const cy = region.y + Math.floor(region.height / 2);
    const maxHalfW = Math.max(2, Math.floor(region.width / 2) - 2);
    const maxHalfH = Math.max(2, Math.floor(region.height / 2) - 1);
    const easedDepth = Math.pow(clamp01(ring.depth), 0.82);
    const wobbleX = Math.round(Math.sin(nowMs / 320 + ring.phase) * state.high * 1.6 + ring.skewX * state.mid * 1.5);
    const wobbleY = Math.round(Math.cos(nowMs / 470 + ring.phase) * state.mid * 1.4 + ring.skewY * state.low);
    const halfW = Math.max(1, Math.round(maxHalfW * easedDepth));
    const halfH = Math.max(1, Math.round(maxHalfH * easedDepth));
    const left = cx - halfW + wobbleX;
    const right = cx + halfW + wobbleX;
    const top = cy - halfH + wobbleY;
    const bottom = cy + halfH + wobbleY;
    const intensity = 0.18 + clamp01(ring.depth) * 0.62 + state.pulse * 0.08;
    const edgeChar = ring.depth > 0.78 ? "#" : ring.depth > 0.45 ? "+" : ".";
    for (let x = left + 1; x < right; x++) {
        renderer.writeCell(x, top, styleCell("-", theme, state, intensity));
        renderer.writeCell(x, bottom, styleCell("-", theme, state, intensity));
    }
    for (let y = top + 1; y < bottom; y++) {
        renderer.writeCell(left, y, styleCell("|", theme, state, intensity));
        renderer.writeCell(right, y, styleCell("|", theme, state, intensity));
    }
    renderer.writeCell(left, top, styleCell("/", theme, state, intensity));
    renderer.writeCell(right, top, styleCell("\\", theme, state, intensity));
    renderer.writeCell(left, bottom, styleCell("\\", theme, state, intensity));
    renderer.writeCell(right, bottom, styleCell("/", theme, state, intensity));
    const midY = Math.floor((top + bottom) / 2);
    const midX = Math.floor((left + right) / 2);
    renderer.writeCell(midX, midY, styleCell(edgeChar, theme, state, intensity + 0.08));
}
function renderTunnel(state, renderer, region, theme) {
    const data = getTunnelModeData(state, region.width, region.height);
    const nowMs = Date.now() - state.startTime;
    const orderedRings = [...data.rings].sort((a, b) => a.depth - b.depth);
    for (const ring of orderedRings) {
        drawRing(renderer, state, theme, region, ring, nowMs);
    }
    const cx = region.x + Math.floor(region.width / 2);
    const cy = region.y + Math.floor(region.height / 2);
    const vanishing = state.pulse > 0.45 ? "*" : ".";
    renderer.writeCell(cx, cy, styleCell(vanishing, theme, state, 0.95));
}
//# sourceMappingURL=tunnel.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prepareFire = prepareFire;
exports.renderFire = renderFire;
const pitchPalette_js_1 = require("../pitchPalette.js");
const FIRE_RAMP = [" ", ".", ",", ":", ";", "x", "X", "%", "#", "@"];
function clamp01(value) {
    return Math.max(0, Math.min(1, value));
}
function hashNoise(a, b, c) {
    let value = Math.imul(a + 19, 73856093) ^ Math.imul(b + 31, 19349663) ^ Math.imul(c + 47, 83492791);
    value = (value >>> 0) % 1000;
    return value / 1000;
}
function getFireModeData(state, width, height) {
    const existing = state.modeData.fire;
    if (existing && existing.width === width && existing.height === height) {
        return existing;
    }
    const next = {
        width,
        height,
        heat: new Float32Array(width * height),
    };
    state.modeData.fire = next;
    return next;
}
function setHeat(data, x, y, value) {
    if (x < 0 || x >= data.width || y < 0 || y >= data.height)
        return;
    data.heat[y * data.width + x] = clamp01(value);
}
function getHeat(data, x, y) {
    if (x < 0 || x >= data.width || y < 0 || y >= data.height)
        return 0;
    return data.heat[y * data.width + x] ?? 0;
}
function styleCell(ch, theme, state, intensity) {
    if (!theme.colorEnabled)
        return ch;
    return (0, pitchPalette_js_1.pitchAnsiColor)(state.pitchHue, state.pitchSaturation, intensity) + ch + theme.reset;
}
function prepareFire(state, region) {
    const data = getFireModeData(state, region.width, region.height);
    const next = new Float32Array(data.width * data.height);
    const now = Math.floor((Date.now() - state.startTime) / 80);
    for (let y = 0; y < data.height - 1; y++) {
        for (let x = 0; x < data.width; x++) {
            const below = getHeat(data, x, y + 1);
            const leftBelow = getHeat(data, x - 1, y + 1);
            const rightBelow = getHeat(data, x + 1, y + 1);
            const farBelow = getHeat(data, x, y + 2);
            const cooling = 0.04 + hashNoise(x, y, now) * (0.05 + state.high * 0.06);
            const value = below * 0.42 +
                leftBelow * 0.22 +
                rightBelow * 0.22 +
                farBelow * 0.14 -
                cooling;
            next[y * data.width + x] = clamp01(value);
        }
    }
    const lastRow = data.height - 1;
    for (let x = 0; x < data.width; x++) {
        const bucketIndex = Math.floor((x * state.smoothedBuckets.length) / Math.max(1, data.width));
        const bucket = state.smoothedBuckets[bucketIndex] ?? 0;
        const ember = hashNoise(x, lastRow, now);
        const base = state.amplitude * 0.3 +
            state.low * 0.34 +
            bucket * 0.42 +
            (ember > 0.52 ? state.pulse * 0.28 : 0);
        next[lastRow * data.width + x] = clamp01(base + ember * 0.14);
        if (data.height > 1) {
            next[(lastRow - 1) * data.width + x] = Math.max(next[(lastRow - 1) * data.width + x] ?? 0, clamp01(base * 0.58));
        }
    }
    const sparkChance = 0.06 + state.high * 0.12 + state.pulse * 0.2;
    const sparkCount = Math.max(1, Math.round(data.width * sparkChance * 0.22));
    for (let i = 0; i < sparkCount; i++) {
        const x = Math.floor(hashNoise(i, now, data.width) * data.width);
        const y = Math.max(0, data.height - 2 - Math.floor(hashNoise(x, i, now) * Math.max(1, data.height / 3)));
        setHeat({ ...data, heat: next }, x, y, Math.max(next[y * data.width + x] ?? 0, clamp01(0.68 + state.high * 0.24 + state.pulse * 0.2)));
    }
    data.heat = next;
}
function renderFire(state, renderer, region, theme) {
    const data = getFireModeData(state, region.width, region.height);
    for (let y = 0; y < data.height; y++) {
        for (let x = 0; x < data.width; x++) {
            const value = getHeat(data, x, y);
            if (value < 0.035)
                continue;
            const idx = Math.max(0, Math.min(FIRE_RAMP.length - 1, Math.floor(value * (FIRE_RAMP.length - 1))));
            const ch = FIRE_RAMP[idx] ?? "@";
            const intensity = 0.2 + value * 0.8;
            renderer.writeCell(region.x + x, region.y + y, styleCell(ch, theme, state, intensity));
        }
    }
}
//# sourceMappingURL=fire.js.map
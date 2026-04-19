"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderStory = renderStory;
const pitchPalette_js_1 = require("../pitchPalette.js");
const format_js_1 = require("../../ui/format.js");
const wavefield_js_1 = require("./wavefield.js");
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
function pickScene(state) {
    const scenes = state.storyboard?.scenes ?? [];
    if (scenes.length === 0)
        return null;
    const byTime = scenes.find((scene) => state.progressMs >= scene.startMs && state.progressMs < scene.endMs);
    if (byTime)
        return byTime;
    if (state.progressMs >= (scenes[scenes.length - 1]?.endMs ?? 0)) {
        return scenes[scenes.length - 1] ?? null;
    }
    const index = clamp(state.storySceneIndex, 0, scenes.length - 1);
    return scenes[index] ?? scenes[0] ?? null;
}
function writeCenteredMessage(renderer, region, theme, lines) {
    const startY = region.y + Math.max(0, Math.floor((region.height - lines.length) / 2));
    for (let i = 0; i < lines.length; i++) {
        const y = startY + i;
        if (y < region.y || y >= region.y + region.height)
            continue;
        const line = (0, format_js_1.truncateMiddle)(lines[i] ?? "", Math.max(1, region.width));
        const x = region.x + Math.max(0, Math.floor((region.width - Array.from(line).length) / 2));
        writeStyledText(renderer, x, y, line, theme.dim, theme.reset);
    }
}
function styleCell(ch, theme, state, intensity) {
    if (!theme.colorEnabled || ch === " ")
        return ch;
    return (0, pitchPalette_js_1.pitchAnsiColor)(state.pitchHue, state.pitchSaturation, intensity) + ch + theme.reset;
}
function renderScene(state, scene, renderer, region, theme) {
    const asciiLines = scene.ascii.filter((line) => line.length > 0);
    if (asciiLines.length === 0) {
        writeCenteredMessage(renderer, region, theme, ["Story scene is empty"]);
        return;
    }
    const visibleHeight = Math.min(region.height - 2, asciiLines.length);
    const startIndex = Math.max(0, Math.floor((asciiLines.length - visibleHeight) / 2));
    const lines = asciiLines.slice(startIndex, startIndex + visibleHeight);
    const maxLineWidth = lines.reduce((best, line) => Math.max(best, Array.from(line).length), 0);
    const elapsed = Date.now() - state.startTime;
    const jitter = Math.round(Math.sin(elapsed / 220) * (state.pulse * 2 + state.amplitude * 1.5));
    const blockX = region.x + Math.max(0, Math.floor((region.width - Math.min(region.width, maxLineWidth)) / 2)) + jitter;
    const blockY = region.y + Math.max(1, Math.floor((region.height - lines.length) / 2));
    const title = (0, format_js_1.truncateMiddle)(`${scene.title}  |  ${scene.mood}`, Math.max(1, region.width));
    writeStyledText(renderer, region.x, region.y, padLine(title, region.width), theme.bright, theme.reset);
    for (let row = 0; row < lines.length; row++) {
        const y = blockY + row;
        if (y <= region.y || y >= region.y + region.height)
            continue;
        const chars = Array.from(lines[row] ?? "");
        const clipped = chars.slice(0, region.width);
        const shimmer = Math.sin(elapsed / 160 + row * 0.6) * state.high * 0.16;
        const rowPulse = 0.18 + clamp(state.amplitude * 0.3 + state.pulse * 0.22 + shimmer, 0, 0.72);
        for (let col = 0; col < clipped.length; col++) {
            const x = blockX + col;
            if (x < region.x || x >= region.x + region.width)
                continue;
            const ch = clipped[col] ?? " ";
            if (ch === " ")
                continue;
            const edgeDistance = clipped.length <= 1 ? 0 : Math.abs(col / (clipped.length - 1) - 0.5) * 2;
            const intensity = clamp(0.95 - edgeDistance * 0.45 + rowPulse, 0.2, 1);
            renderer.writeCell(x, y, styleCell(ch, theme, state, intensity));
        }
    }
    const summary = (0, format_js_1.truncateMiddle)(state.storyboard?.summary ?? "", Math.max(1, region.width));
    if (summary.length > 0 && region.height >= 4) {
        writeStyledText(renderer, region.x, region.y + region.height - 1, padLine(summary, region.width), theme.dim, theme.reset);
    }
}
function writeStyledText(renderer, x, y, text, prefix, suffix) {
    const chars = Array.from(text);
    for (let i = 0; i < chars.length; i++) {
        renderer.writeCell(x + i, y, `${prefix}${chars[i] ?? " "}${suffix}`);
    }
}
function padLine(text, width) {
    const chars = Array.from(text);
    const clipped = chars.slice(0, width).join("");
    return clipped + " ".repeat(Math.max(0, width - Array.from(clipped).length));
}
function renderStory(state, renderer, region, theme) {
    if (region.width < 12 || region.height < 6)
        return;
    if (state.storyStatus === "loading") {
        (0, wavefield_js_1.renderWavefield)(state, renderer, region, theme);
        writeCenteredMessage(renderer, region, theme, [
            "Generating story scene...",
            `${state.trackName || "Waiting for track context"}`
        ]);
        return;
    }
    if (state.storyStatus === "error") {
        (0, wavefield_js_1.renderWavefield)(state, renderer, region, theme);
        writeCenteredMessage(renderer, region, theme, [
            "Story generation unavailable",
            (0, format_js_1.truncateMiddle)(state.storyError || "Using fallback visualizer mode", Math.max(1, region.width))
        ]);
        return;
    }
    const scene = pickScene(state);
    if (!scene) {
        (0, wavefield_js_1.renderWavefield)(state, renderer, region, theme);
        const contextLine = state.storyContext?.lyricSummaryText || state.statusMessage || "No story context yet";
        writeCenteredMessage(renderer, region, theme, [
            "Story mode ready",
            (0, format_js_1.truncateMiddle)(contextLine, Math.max(1, region.width))
        ]);
        return;
    }
    renderScene(state, scene, renderer, region, theme);
}
//# sourceMappingURL=story.js.map
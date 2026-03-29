"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatSeconds = formatSeconds;
exports.truncateMiddle = truncateMiddle;
exports.padRight = padRight;
exports.padLeft = padLeft;
exports.centerPad = centerPad;
/** Format seconds as MM:SS */
function formatSeconds(seconds) {
    const s = Math.max(0, Math.floor(seconds));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem.toString().padStart(2, "0")}`;
}
/**
 * Truncate a string to maxWidth, replacing the middle with "…" when needed.
 * Ensures the result never exceeds maxWidth characters.
 */
function truncateMiddle(text, maxWidth) {
    if (text.length <= maxWidth)
        return text;
    if (maxWidth <= 3)
        return text.slice(0, maxWidth);
    const half = Math.floor((maxWidth - 1) / 2);
    return text.slice(0, half) + "\u2026" + text.slice(text.length - (maxWidth - half - 1));
}
function padRight(text, width, fill = " ") {
    const needed = width - text.length;
    if (needed <= 0)
        return text.slice(0, width);
    return text + fill.repeat(needed);
}
function padLeft(text, width, fill = " ") {
    const needed = width - text.length;
    if (needed <= 0)
        return text.slice(0, width);
    return fill.repeat(needed) + text;
}
function centerPad(text, width, fill = " ") {
    const needed = width - text.length;
    if (needed <= 0)
        return text.slice(0, width);
    const left = Math.floor(needed / 2);
    const right = needed - left;
    return fill.repeat(left) + text + fill.repeat(right);
}
//# sourceMappingURL=format.js.map
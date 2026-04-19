"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripAnsi = stripAnsi;
exports.sanitizeModelText = sanitizeModelText;
exports.sanitizeAsciiLines = sanitizeAsciiLines;
const ANSI_PATTERN = /\x1B\[[0-?]*[ -/]*[@-~]/g;
const ASCII_SAFE_ALLOWED = new Set(Array.from(" .,:;'\"`-_/\\|()[]{}+*#%@=<>"));
const EXTENDED_ALLOWED = new Set(Array.from(" .,:;'\"`-_/\\|()[]{}+*#%@=<>│─┌┐└┘╱╲░▒▓█"));
function stripCodeFences(value) {
    return value
        .replace(/^```[a-zA-Z0-9_-]*\s*/g, "")
        .replace(/\s*```$/g, "");
}
function stripAnsi(value) {
    return value.replace(ANSI_PATTERN, "");
}
function sanitizeModelText(value) {
    return stripAnsi(stripCodeFences(value))
        .replace(/\r\n/g, "\n")
        .replace(/\t/g, "  ");
}
function sanitizeChar(ch, asciiSafe) {
    if (ch === "\n")
        return ch;
    const allowed = asciiSafe ? ASCII_SAFE_ALLOWED : EXTENDED_ALLOWED;
    return allowed.has(ch) ? ch : " ";
}
function padOrTrimLine(line, width) {
    const chars = Array.from(line);
    if (chars.length >= width) {
        return chars.slice(0, width).join("");
    }
    return chars.join("") + " ".repeat(width - chars.length);
}
function sanitizeAsciiLines(rawLines, width, height, asciiSafe) {
    const sanitized = rawLines.map((line) => {
        const cleanedLine = sanitizeModelText(line);
        const chars = Array.from(cleanedLine).map((ch) => sanitizeChar(ch, asciiSafe));
        return padOrTrimLine(chars.join(""), width);
    });
    const clipped = sanitized.slice(0, height);
    while (clipped.length < height) {
        clipped.push(" ".repeat(width));
    }
    return clipped;
}
//# sourceMappingURL=sanitize.js.map
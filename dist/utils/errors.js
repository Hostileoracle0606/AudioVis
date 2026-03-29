"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fatalError = fatalError;
exports.warnError = warnError;
const picocolors_1 = __importDefault(require("picocolors"));
function fatalError(message, err) {
    const detail = err instanceof Error ? err.message : err ? String(err) : "";
    console.error(picocolors_1.default.red(`\nError: ${message}`) + (detail ? `\n  ${detail}` : ""));
    process.exit(1);
}
function warnError(message, err) {
    const detail = err instanceof Error ? err.message : err ? String(err) : "";
    console.error(picocolors_1.default.yellow(`Warning: ${message}`) + (detail ? ` (${detail})` : ""));
}
//# sourceMappingURL=errors.js.map
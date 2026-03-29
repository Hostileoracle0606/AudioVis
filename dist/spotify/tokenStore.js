"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadTokens = loadTokens;
exports.saveTokens = saveTokens;
exports.clearTokens = clearTokens;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
function getTokenPath() {
    // In development, keep tokens in the project directory.
    // In production (after npm link), store in user config dir.
    const configDir = process.env.NODE_ENV === "development"
        ? process.cwd()
        : path_1.default.join(os_1.default.homedir(), ".config", "audio-vis");
    if (!fs_1.default.existsSync(configDir)) {
        fs_1.default.mkdirSync(configDir, { recursive: true });
    }
    return path_1.default.join(configDir, ".spotify-tokens.json");
}
function loadTokens() {
    const p = getTokenPath();
    if (!fs_1.default.existsSync(p))
        return null;
    try {
        const raw = fs_1.default.readFileSync(p, "utf8");
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
function saveTokens(tokens) {
    const p = getTokenPath();
    fs_1.default.writeFileSync(p, JSON.stringify(tokens, null, 2), "utf8");
}
function clearTokens() {
    const p = getTokenPath();
    if (fs_1.default.existsSync(p))
        fs_1.default.unlinkSync(p);
}
//# sourceMappingURL=tokenStore.js.map
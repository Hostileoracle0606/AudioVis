"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureDir = ensureDir;
exports.getAppHomeDir = getAppHomeDir;
exports.getConfigPath = getConfigPath;
exports.getTokenPath = getTokenPath;
exports.getBundledDefaultsPath = getBundledDefaultsPath;
exports.getBundledBlackHolePkgPath = getBundledBlackHolePkgPath;
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const APP_DIR_NAME = "Audio Vis";
function ensureDir(dirPath) {
    if (!fs_1.default.existsSync(dirPath)) {
        fs_1.default.mkdirSync(dirPath, { recursive: true });
    }
    return dirPath;
}
function getAppHomeDir() {
    if (process.env.AUDIO_VIS_HOME) {
        return ensureDir(process.env.AUDIO_VIS_HOME);
    }
    if (process.platform === "darwin") {
        return ensureDir(path_1.default.join(os_1.default.homedir(), "Library", "Application Support", APP_DIR_NAME));
    }
    return ensureDir(path_1.default.join(os_1.default.homedir(), ".config", "audio-vis"));
}
function getConfigPath() {
    return path_1.default.join(getAppHomeDir(), "config.json");
}
function getTokenPath() {
    return path_1.default.join(getAppHomeDir(), "spotify-tokens.json");
}
function getBundledDefaultsPath() {
    const candidate = process.env.AUDIO_VIS_DEFAULT_CONFIG_PATH;
    if (!candidate || !fs_1.default.existsSync(candidate)) {
        return null;
    }
    return candidate;
}
function getBundledBlackHolePkgPath() {
    const candidate = process.env.AUDIO_VIS_BLACKHOLE_PKG;
    if (!candidate || !fs_1.default.existsSync(candidate)) {
        return null;
    }
    return candidate;
}
//# sourceMappingURL=paths.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
exports.saveConfig = saveConfig;
const fs_1 = __importDefault(require("fs"));
const paths_js_1 = require("../utils/paths.js");
function readConfigFile(filePath) {
    try {
        return JSON.parse(fs_1.default.readFileSync(filePath, "utf8"));
    }
    catch {
        return {};
    }
}
function mergeConfig(base, override) {
    return {
        spotify: {
            ...base.spotify,
            ...override.spotify,
        },
        audio: {
            ...base.audio,
            ...override.audio,
        },
    };
}
function loadConfig() {
    const defaultsPath = (0, paths_js_1.getBundledDefaultsPath)();
    const defaults = defaultsPath ? readConfigFile(defaultsPath) : {};
    const savedPath = (0, paths_js_1.getConfigPath)();
    const saved = fs_1.default.existsSync(savedPath) ? readConfigFile(savedPath) : {};
    return mergeConfig(defaults, saved);
}
function saveConfig(nextConfig) {
    const merged = mergeConfig(loadConfig(), nextConfig);
    fs_1.default.writeFileSync((0, paths_js_1.getConfigPath)(), JSON.stringify(merged, null, 2) + "\n", "utf8");
    return merged;
}
//# sourceMappingURL=store.js.map
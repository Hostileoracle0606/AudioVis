"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadTokens = loadTokens;
exports.saveTokens = saveTokens;
exports.clearTokens = clearTokens;
const fs_1 = __importDefault(require("fs"));
const paths_js_1 = require("../utils/paths.js");
function loadTokens() {
    const p = (0, paths_js_1.getTokenPath)();
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
    const p = (0, paths_js_1.getTokenPath)();
    fs_1.default.writeFileSync(p, JSON.stringify(tokens, null, 2), "utf8");
}
function clearTokens() {
    const p = (0, paths_js_1.getTokenPath)();
    if (fs_1.default.existsSync(p))
        fs_1.default.unlinkSync(p);
}
//# sourceMappingURL=tokenStore.js.map
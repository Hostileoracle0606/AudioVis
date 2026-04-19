"use strict";
/**
 * Minimal config store stub.
 * Real implementation pending — returns empty config so CLI commands that
 * call `loadConfig()` as a fallback-lookup don't crash at import time.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
function loadConfig() {
    return {};
}
//# sourceMappingURL=store.js.map
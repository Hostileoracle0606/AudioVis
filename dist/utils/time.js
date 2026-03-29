"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.msToSeconds = msToSeconds;
exports.nowSeconds = nowSeconds;
exports.sleep = sleep;
function msToSeconds(ms) {
    return Math.floor(ms / 1000);
}
function nowSeconds() {
    return Date.now() / 1000;
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
//# sourceMappingURL=time.js.map
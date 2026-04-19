"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPlayerBackend = getPlayerBackend;
const store_js_1 = require("../config/store.js");
const factory_js_1 = require("../player/factory.js");
async function getPlayerBackend() {
    return (0, factory_js_1.requirePlayerBackend)((0, store_js_1.loadConfig)());
}
//# sourceMappingURL=playerRuntime.js.map
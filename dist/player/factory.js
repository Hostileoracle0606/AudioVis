"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPlayerBackend = createPlayerBackend;
exports.requirePlayerBackend = requirePlayerBackend;
const spotifyDesktop_js_1 = require("./macos/spotifyDesktop.js");
function createPlayerBackend(_config) {
    return new spotifyDesktop_js_1.SpotifyDesktopBackend();
}
async function requirePlayerBackend(config) {
    const backend = createPlayerBackend(config);
    const availability = await backend.isAvailable();
    if (!availability.available) {
        throw new Error(availability.message || "Player backend unavailable.");
    }
    return backend;
}
//# sourceMappingURL=factory.js.map
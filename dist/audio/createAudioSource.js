"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAudioSource = createAudioSource;
const silent_js_1 = require("./silent.js");
/**
 * Factory: selects the correct platform backend based on process.platform
 * and constructs an AudioSource with the given options.
 *
 * Pass `silent: true` to skip audio capture entirely (emits zero-filled
 * frames) — useful for testing the visualizer UI without a real audio device.
 */
function createAudioSource(opts) {
    if (opts.silent)
        return (0, silent_js_1.createSilentAudioSource)(opts);
    switch (process.platform) {
        case "linux": {
            const { createLinuxAudioSource } = require("./platform/linux.js");
            return createLinuxAudioSource(opts);
        }
        case "win32": {
            const { createWindowsAudioSource } = require("./platform/windows.js");
            return createWindowsAudioSource(opts);
        }
        case "darwin": {
            const { createMacosAudioSource } = require("./platform/macos.js");
            return createMacosAudioSource(opts);
        }
        default:
            throw new Error(`Unsupported platform: ${process.platform}.\n` +
                "Supported platforms: linux, win32, darwin.");
    }
}
//# sourceMappingURL=createAudioSource.js.map
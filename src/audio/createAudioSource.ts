import type { AudioSource, AudioSourceOptions } from "./AudioSource.js";

/**
 * Factory: selects the correct platform backend based on process.platform
 * and constructs an AudioSource with the given options.
 */
export function createAudioSource(opts: AudioSourceOptions): AudioSource {
  switch (process.platform) {
    case "linux": {
      const { createLinuxAudioSource } = require("./platform/linux.js") as typeof import("./platform/linux.js");
      return createLinuxAudioSource(opts);
    }
    case "win32": {
      const { createWindowsAudioSource } = require("./platform/windows.js") as typeof import("./platform/windows.js");
      return createWindowsAudioSource(opts);
    }
    case "darwin": {
      const { createMacosAudioSource } = require("./platform/macos.js") as typeof import("./platform/macos.js");
      return createMacosAudioSource(opts);
    }
    default:
      throw new Error(
        `Unsupported platform: ${process.platform}.\n` +
          "Supported platforms: linux, win32, darwin."
      );
  }
}

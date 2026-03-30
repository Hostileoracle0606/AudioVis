"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureMacosReady = ensureMacosReady;
const child_process_1 = require("child_process");
const picocolors_1 = __importDefault(require("picocolors"));
const ffmpeg_js_1 = require("../audio/ffmpeg.js");
const store_js_1 = require("../config/store.js");
const paths_js_1 = require("../utils/paths.js");
const prompt_js_1 = require("../utils/prompt.js");
function listAvFoundationDevices() {
    const result = (0, child_process_1.spawnSync)((0, ffmpeg_js_1.resolveFfmpegBinary)(), ["-hide_banner", "-f", "avfoundation", "-list_devices", "true", "-i", ""], { encoding: "utf8" });
    const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
    return output
        .split("\n")
        .map((line) => line.match(/\[\d+\]\s+(.+)$/)?.[1]?.trim() ?? "")
        .filter(Boolean);
}
function detectBlackHoleDeviceName() {
    const devices = listAvFoundationDevices();
    return (devices.find((device) => /BlackHole/i.test(device)) ??
        devices.find((device) => /Loopback/i.test(device)) ??
        null);
}
function openAudioMidiSetup() {
    (0, child_process_1.spawnSync)("open", ["-a", "Audio MIDI Setup"], { stdio: "inherit" });
}
async function ensureSpotifyCredentials() {
    const config = (0, store_js_1.loadConfig)();
    if (config.spotify?.clientId && config.spotify?.clientSecret) {
        return;
    }
    console.log(picocolors_1.default.cyan("\nSpotify setup"));
    console.log("Create a Spotify app at https://developer.spotify.com/dashboard and register:");
    console.log("  http://127.0.0.1:8888/callback\n");
    const clientId = await (0, prompt_js_1.promptRequired)("Spotify Client ID: ");
    const clientSecret = await (0, prompt_js_1.promptRequired)("Spotify Client Secret: ");
    (0, store_js_1.saveConfig)({
        spotify: {
            clientId,
            clientSecret,
            redirectUri: "http://127.0.0.1:8888/callback",
            callbackPort: 8888,
        },
    });
}
async function ensureBlackHole() {
    const existing = detectBlackHoleDeviceName();
    if (existing) {
        return existing;
    }
    console.log(picocolors_1.default.cyan("\nmacOS audio capture setup"));
    console.log("This app needs a loopback device like BlackHole to capture system audio.");
    const bundledPkg = (0, paths_js_1.getBundledBlackHolePkgPath)();
    if (bundledPkg) {
        const shouldOpen = await (0, prompt_js_1.promptConfirm)("A bundled BlackHole installer was found. Open it now?");
        if (shouldOpen) {
            (0, child_process_1.spawnSync)("open", ["-W", bundledPkg], { stdio: "inherit" });
        }
    }
    else {
        console.log("Install BlackHole 2ch from https://github.com/ExistentialAudio/BlackHole");
    }
    const installed = detectBlackHoleDeviceName();
    if (!installed) {
        throw new Error("BlackHole is still not visible to macOS. Install it, then rerun `myviz launch`.");
    }
    return installed;
}
async function ensureRouting(deviceName) {
    console.log(`\n${deviceName} is installed. The remaining macOS step is routing output through it.`);
    const shouldOpenAudioMidi = await (0, prompt_js_1.promptConfirm)("Open Audio MIDI Setup so you can create or verify a Multi-Output Device?");
    if (shouldOpenAudioMidi) {
        openAudioMidiSetup();
    }
    console.log("In Audio MIDI Setup:");
    console.log("  1. Create a Multi-Output Device.");
    console.log(`  2. Include both your speakers and ${deviceName}.`);
    console.log("  3. Set that Multi-Output Device as the current macOS output.\n");
    await (0, prompt_js_1.waitForEnter)("Press Enter after that is ready. ");
}
async function ensureMacosReady() {
    if (process.platform !== "darwin") {
        throw new Error("The guided setup assistant is only available on macOS.");
    }
    await ensureSpotifyCredentials();
    const config = (0, store_js_1.loadConfig)();
    let deviceName = config.audio?.macosDeviceName ?? detectBlackHoleDeviceName();
    if (!deviceName) {
        deviceName = await ensureBlackHole();
    }
    if (!config.audio?.macosRoutingConfirmed) {
        await ensureRouting(deviceName);
    }
    (0, store_js_1.saveConfig)({
        audio: {
            macosDeviceName: deviceName,
            macosRoutingConfirmed: true,
        },
    });
    return { deviceName };
}
//# sourceMappingURL=setup.js.map
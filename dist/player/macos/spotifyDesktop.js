"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpotifyDesktopBackend = void 0;
exports.parseSpotifyDesktopStateOutput = parseSpotifyDesktopStateOutput;
exports.isSpotifyDesktopInstalled = isSpotifyDesktopInstalled;
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
function sanitizeSegment(value) {
    return value.replace(/\r?\n/g, " ").trim();
}
function parseSpotifyDesktopStateOutput(output) {
    const trimmed = output.trim();
    if (!trimmed) {
        return { status: "error", message: "Empty Spotify Desktop response." };
    }
    const fields = new Map();
    for (const segment of trimmed.split("|")) {
        const idx = segment.indexOf("=");
        if (idx <= 0)
            continue;
        const key = segment.slice(0, idx).trim();
        const value = sanitizeSegment(segment.slice(idx + 1));
        fields.set(key, value);
    }
    const status = fields.get("status");
    if (status === "not_running" || status === "not_playing") {
        return { status };
    }
    if (status !== "ok") {
        return {
            status: "error",
            message: fields.get("message") || `Unknown Spotify Desktop response: ${trimmed}`,
        };
    }
    const trackName = fields.get("track");
    const artistName = fields.get("artist");
    const albumName = fields.get("album");
    const appName = fields.get("app") || "Spotify";
    const durationMs = Number(fields.get("duration"));
    const progressMs = Number(fields.get("position"));
    const isPlaying = fields.get("playing") === "1";
    if (!trackName ||
        !artistName ||
        !albumName ||
        !Number.isFinite(durationMs) ||
        !Number.isFinite(progressMs)) {
        return {
            status: "error",
            message: `Malformed Spotify Desktop response: ${trimmed}`,
        };
    }
    return {
        status: "ok",
        state: {
            trackName,
            artistName,
            albumName,
            durationMs: Math.max(0, Math.round(durationMs)),
            progressMs: Math.max(0, Math.round(progressMs)),
            isPlaying,
            appName,
        },
    };
}
async function runOsaScript(lines) {
    const args = lines.flatMap((line) => ["-e", line]);
    try {
        const { stdout } = await execFileAsync("/usr/bin/osascript", args, {
            maxBuffer: 1024 * 1024,
            timeout: 5_000,
            killSignal: "SIGKILL",
        });
        return stdout.trim();
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`Spotify Desktop automation failed. If this is the first run, approve Terminal/Codex in macOS Automation settings. ${msg}`);
    }
}
function buildGetStateScript() {
    return [
        'if application "Spotify" is not running then',
        '  return "status=not_running"',
        "end if",
        'tell application "Spotify"',
        "  if player state is stopped then",
        '    return "status=not_playing"',
        "  end if",
        "  set trackName to my sanitizeText(name of current track)",
        "  set artistName to my sanitizeText(artist of current track)",
        "  set albumName to my sanitizeText(album of current track)",
        "  set durationMs to duration of current track",
        "  set positionMs to round ((player position) * 1000)",
        '  set playingFlag to "0"',
        "  if player state is playing then set playingFlag to \"1\"",
        '  return "status=ok|track=" & trackName & "|artist=" & artistName & "|album=" & albumName & "|duration=" & durationMs & "|position=" & positionMs & "|playing=" & playingFlag & "|app=Spotify"',
        "end tell",
        "",
        "on sanitizeText(value)",
        "  set cleaned to value as text",
        '  set cleaned to my replaceText("|", "/", cleaned)',
        '  set cleaned to my replaceText(return, " ", cleaned)',
        '  set cleaned to my replaceText(linefeed, " ", cleaned)',
        "  return cleaned",
        "end sanitizeText",
        "",
        "on replaceText(findText, replaceText, inputText)",
        "  set AppleScript's text item delimiters to findText",
        "  set textItems to every text item of inputText",
        "  set AppleScript's text item delimiters to replaceText",
        "  set outputText to textItems as text",
        "  set AppleScript's text item delimiters to \"\"",
        "  return outputText",
        "end replaceText",
    ];
}
async function tellSpotify(command) {
    await runOsaScript([
        'if application "Spotify" is not running then',
        '  error "Spotify Desktop is not running."',
        "end if",
        'tell application "Spotify"',
        `  ${command}`,
        "end tell",
    ]);
}
function isSpotifyDesktopInstalled() {
    const homeApp = path_1.default.join(os_1.default.homedir(), "Applications", "Spotify.app");
    if (fs_1.default.existsSync("/Applications/Spotify.app") || fs_1.default.existsSync(homeApp)) {
        return true;
    }
    const mdfind = (0, child_process_1.spawnSync)("mdfind", ['kMDItemCFBundleIdentifier == "com.spotify.client"'], { encoding: "utf8" });
    return mdfind.status === 0 && (mdfind.stdout ?? "").trim().length > 0;
}
class SpotifyDesktopBackend {
    async getState() {
        const parsed = parseSpotifyDesktopStateOutput(await runOsaScript(buildGetStateScript()));
        if (parsed.status === "ok") {
            return parsed.state;
        }
        if (parsed.status === "not_running" || parsed.status === "not_playing") {
            return null;
        }
        if (parsed.status === "error") {
            throw new Error(parsed.message);
        }
        throw new Error("Unknown Spotify Desktop state response.");
    }
    async play() {
        await tellSpotify("play");
    }
    async pause() {
        await tellSpotify("pause");
    }
    async next() {
        await tellSpotify("next track");
    }
    async previous() {
        await tellSpotify("previous track");
    }
    async setVolume(percent) {
        const clamped = Math.max(0, Math.min(100, Math.round(percent)));
        await tellSpotify(`set sound volume to ${clamped}`);
    }
    async isAvailable() {
        if (process.platform !== "darwin") {
            return {
                available: false,
                message: "Spotify Desktop control is only supported on macOS in this build.",
            };
        }
        if (!fs_1.default.existsSync("/usr/bin/osascript")) {
            return {
                available: false,
                message: "osascript is unavailable on this machine.",
            };
        }
        if (!isSpotifyDesktopInstalled()) {
            return {
                available: false,
                message: "Spotify Desktop is not installed. Install Spotify.app first.",
            };
        }
        return { available: true };
    }
    capabilities() {
        return {
            currentTrack: true,
            transport: true,
            volume: true,
        };
    }
}
exports.SpotifyDesktopBackend = SpotifyDesktopBackend;
//# sourceMappingURL=spotifyDesktop.js.map
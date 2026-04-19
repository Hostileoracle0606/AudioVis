"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getState = getState;
exports.play = play;
exports.pause = pause;
exports.nextTrack = nextTrack;
exports.previousTrack = previousTrack;
const child_process_1 = require("child_process");
const util_1 = require("util");
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
async function runOsa(lines) {
    const args = lines.flatMap((l) => ["-e", l]);
    const { stdout } = await execFileAsync("/usr/bin/osascript", args, {
        maxBuffer: 1024 * 1024,
        timeout: 5_000,
        killSignal: "SIGKILL",
    });
    return stdout.trim();
}
const STATE_SCRIPT = [
    'if application "Spotify" is not running then',
    '  return "status=not_running"',
    "end if",
    'tell application "Spotify"',
    "  if player state is stopped then",
    '    return "status=not_playing"',
    "  end if",
    "  set t to my san(name of current track)",
    "  set ar to my san(artist of current track)",
    "  set al to my san(album of current track)",
    '  set artUrl to ""',
    "  try",
    '    set artUrl to artwork url of current track',
    "  end try",
    "  set dur to duration of current track",
    "  set pos to round ((player position) * 1000)",
    '  set flag to "0"',
    '  if player state is playing then set flag to "1"',
    '  return "status=ok|t=" & t & "|ar=" & ar & "|al=" & al & "|art=" & artUrl & "|dur=" & dur & "|pos=" & pos & "|play=" & flag',
    "end tell",
    "",
    "on san(v)",
    "  set v to v as text",
    "  set AppleScript's text item delimiters to \"|\"",
    "  set parts to every text item of v",
    "  set AppleScript's text item delimiters to \"/\"",
    "  set v to parts as text",
    "  set AppleScript's text item delimiters to \"\"",
    "  return v",
    "end san",
];
async function getState() {
    if (process.platform !== "darwin")
        return null;
    let raw;
    try {
        raw = await runOsa(STATE_SCRIPT);
    }
    catch {
        return null;
    }
    const fields = new Map();
    for (const seg of raw.split("|")) {
        const i = seg.indexOf("=");
        if (i <= 0)
            continue;
        fields.set(seg.slice(0, i).trim(), seg.slice(i + 1));
    }
    if (fields.get("status") !== "ok")
        return null;
    const trackName = fields.get("t");
    const artistName = fields.get("ar") ?? "";
    const albumName = fields.get("al") ?? "";
    const albumArtUrl = fields.get("art") ?? "";
    const durationMs = Number(fields.get("dur"));
    const progressMs = Number(fields.get("pos"));
    const isPlaying = fields.get("play") === "1";
    if (!trackName || !Number.isFinite(durationMs) || !Number.isFinite(progressMs)) {
        return null;
    }
    return {
        trackName,
        artistName,
        albumName,
        albumArtUrl,
        deviceName: "Spotify",
        isPlaying,
        durationMs: Math.max(0, Math.round(durationMs)),
        progressMs: Math.max(0, Math.round(progressMs)),
    };
}
async function tell(command) {
    await execFileAsync("/usr/bin/osascript", [
        "-e", 'if application "Spotify" is not running then error "Spotify is not running"',
        "-e", 'tell application "Spotify"',
        "-e", `  ${command}`,
        "-e", "end tell",
    ], { timeout: 5_000, killSignal: "SIGKILL" });
}
async function play() { await tell("play"); }
async function pause() { await tell("pause"); }
async function nextTrack() { await tell("next track"); }
async function previousTrack() { await tell("previous track"); }
//# sourceMappingURL=spotifyDesktop.js.map
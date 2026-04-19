import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface DesktopState {
  trackName: string;
  artistName: string;
  albumName: string;
  albumArtUrl: string;
  deviceName: string;
  isPlaying: boolean;
  progressMs: number;
  durationMs: number;
}

async function runOsa(lines: string[]): Promise<string> {
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

export async function getState(): Promise<DesktopState | null> {
  if (process.platform !== "darwin") return null;

  let raw: string;
  try {
    raw = await runOsa(STATE_SCRIPT);
  } catch {
    return null;
  }

  const fields = new Map<string, string>();
  for (const seg of raw.split("|")) {
    const i = seg.indexOf("=");
    if (i <= 0) continue;
    fields.set(seg.slice(0, i).trim(), seg.slice(i + 1));
  }

  if (fields.get("status") !== "ok") return null;

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

async function tell(command: string): Promise<void> {
  await execFileAsync(
    "/usr/bin/osascript",
    [
      "-e", 'if application "Spotify" is not running then error "Spotify is not running"',
      "-e", 'tell application "Spotify"',
      "-e", `  ${command}`,
      "-e", "end tell",
    ],
    { timeout: 5_000, killSignal: "SIGKILL" }
  );
}

export async function play(): Promise<void>          { await tell("play"); }
export async function pause(): Promise<void>         { await tell("pause"); }
export async function nextTrack(): Promise<void>     { await tell("next track"); }
export async function previousTrack(): Promise<void> { await tell("previous track"); }

import { spawnSync } from "child_process";
import pc from "picocolors";
import { resolveFfmpegBinary } from "../audio/ffmpeg.js";
import { loadConfig, saveConfig } from "../config/store.js";
import { getBundledBlackHolePkgPath } from "../utils/paths.js";
import { promptConfirm, promptRequired, waitForEnter } from "../utils/prompt.js";

export interface MacosSetupResult {
  deviceName: string;
}

function listAvFoundationDevices(): string[] {
  const result = spawnSync(
    resolveFfmpegBinary(),
    ["-hide_banner", "-f", "avfoundation", "-list_devices", "true", "-i", ""],
    { encoding: "utf8" }
  );

  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  return output
    .split("\n")
    .map((line) => line.match(/\[\d+\]\s+(.+)$/)?.[1]?.trim() ?? "")
    .filter(Boolean);
}

function detectBlackHoleDeviceName(): string | null {
  const devices = listAvFoundationDevices();
  return (
    devices.find((device) => /BlackHole/i.test(device)) ??
    devices.find((device) => /Loopback/i.test(device)) ??
    null
  );
}

function openAudioMidiSetup(): void {
  spawnSync("open", ["-a", "Audio MIDI Setup"], { stdio: "inherit" });
}

async function ensureSpotifyCredentials(): Promise<void> {
  const config = loadConfig();
  if (config.spotify?.clientId && config.spotify?.clientSecret) {
    return;
  }

  console.log(pc.cyan("\nSpotify setup"));
  console.log(
    "Create a Spotify app at https://developer.spotify.com/dashboard and register:"
  );
  console.log("  http://127.0.0.1:8888/callback\n");

  const clientId = await promptRequired("Spotify Client ID: ");
  const clientSecret = await promptRequired("Spotify Client Secret: ");

  saveConfig({
    spotify: {
      clientId,
      clientSecret,
      redirectUri: "http://127.0.0.1:8888/callback",
      callbackPort: 8888,
    },
  });
}

async function ensureBlackHole(): Promise<string> {
  const existing = detectBlackHoleDeviceName();
  if (existing) {
    return existing;
  }

  console.log(pc.cyan("\nmacOS audio capture setup"));
  console.log(
    "This app needs a loopback device like BlackHole to capture system audio."
  );

  const bundledPkg = getBundledBlackHolePkgPath();
  if (bundledPkg) {
    const shouldOpen = await promptConfirm(
      "A bundled BlackHole installer was found. Open it now?"
    );
    if (shouldOpen) {
      spawnSync("open", ["-W", bundledPkg], { stdio: "inherit" });
    }
  } else {
    console.log(
      "Install BlackHole 2ch from https://github.com/ExistentialAudio/BlackHole"
    );
  }

  const installed = detectBlackHoleDeviceName();
  if (!installed) {
    throw new Error(
      "BlackHole is still not visible to macOS. Install it, then rerun `myviz launch`."
    );
  }

  return installed;
}

async function ensureRouting(deviceName: string): Promise<void> {
  console.log(
    `\n${deviceName} is installed. The remaining macOS step is routing output through it.`
  );

  const shouldOpenAudioMidi = await promptConfirm(
    "Open Audio MIDI Setup so you can create or verify a Multi-Output Device?"
  );
  if (shouldOpenAudioMidi) {
    openAudioMidiSetup();
  }

  console.log("In Audio MIDI Setup:");
  console.log("  1. Create a Multi-Output Device.");
  console.log(`  2. Include both your speakers and ${deviceName}.`);
  console.log("  3. Set that Multi-Output Device as the current macOS output.\n");

  await waitForEnter("Press Enter after that is ready. ");
}

export async function ensureMacosReady(): Promise<MacosSetupResult> {
  if (process.platform !== "darwin") {
    throw new Error("The guided setup assistant is only available on macOS.");
  }

  await ensureSpotifyCredentials();

  const config = loadConfig();
  let deviceName = config.audio?.macosDeviceName ?? detectBlackHoleDeviceName();
  if (!deviceName) {
    deviceName = await ensureBlackHole();
  }

  if (!config.audio?.macosRoutingConfirmed) {
    await ensureRouting(deviceName);
  }

  saveConfig({
    audio: {
      macosDeviceName: deviceName,
      macosRoutingConfirmed: true,
    },
  });

  return { deviceName };
}

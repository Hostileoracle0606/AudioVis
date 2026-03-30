import fs from "fs";
import os from "os";
import path from "path";

const APP_DIR_NAME = "Audio Vis";

export function ensureDir(dirPath: string): string {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  return dirPath;
}

export function getAppHomeDir(): string {
  if (process.env.AUDIO_VIS_HOME) {
    return ensureDir(process.env.AUDIO_VIS_HOME);
  }

  if (process.platform === "darwin") {
    return ensureDir(
      path.join(os.homedir(), "Library", "Application Support", APP_DIR_NAME)
    );
  }

  return ensureDir(path.join(os.homedir(), ".config", "audio-vis"));
}

export function getConfigPath(): string {
  return path.join(getAppHomeDir(), "config.json");
}

export function getTokenPath(): string {
  return path.join(getAppHomeDir(), "spotify-tokens.json");
}

export function getBundledDefaultsPath(): string | null {
  const candidate = process.env.AUDIO_VIS_DEFAULT_CONFIG_PATH;
  if (!candidate || !fs.existsSync(candidate)) {
    return null;
  }

  return candidate;
}

export function getBundledBlackHolePkgPath(): string | null {
  const candidate = process.env.AUDIO_VIS_BLACKHOLE_PKG;
  if (!candidate || !fs.existsSync(candidate)) {
    return null;
  }

  return candidate;
}

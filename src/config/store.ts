import fs from "fs";
import { getBundledDefaultsPath, getConfigPath } from "../utils/paths.js";

export interface AppConfig {
  spotify?: {
    clientId?: string;
    clientSecret?: string;
    redirectUri?: string;
    callbackPort?: number;
  };
  audio?: {
    macosDeviceName?: string;
    macosRoutingConfirmed?: boolean;
  };
}

function readConfigFile(filePath: string): AppConfig {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as AppConfig;
  } catch {
    return {};
  }
}

function mergeConfig(base: AppConfig, override: AppConfig): AppConfig {
  return {
    spotify: {
      ...base.spotify,
      ...override.spotify,
    },
    audio: {
      ...base.audio,
      ...override.audio,
    },
  };
}

export function loadConfig(): AppConfig {
  const defaultsPath = getBundledDefaultsPath();
  const defaults = defaultsPath ? readConfigFile(defaultsPath) : {};
  const savedPath = getConfigPath();
  const saved = fs.existsSync(savedPath) ? readConfigFile(savedPath) : {};

  return mergeConfig(defaults, saved);
}

export function saveConfig(nextConfig: AppConfig): AppConfig {
  const merged = mergeConfig(loadConfig(), nextConfig);
  fs.writeFileSync(getConfigPath(), JSON.stringify(merged, null, 2) + "\n", "utf8");
  return merged;
}

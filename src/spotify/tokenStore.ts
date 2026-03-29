import fs from "fs";
import path from "path";
import os from "os";
import type { TokenPayload } from "./types.js";

function getTokenPath(): string {
  // In development, keep tokens in the project directory.
  // In production (after npm link), store in user config dir.
  const configDir =
    process.env.NODE_ENV === "development"
      ? process.cwd()
      : path.join(os.homedir(), ".config", "audio-vis");

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  return path.join(configDir, ".spotify-tokens.json");
}

export function loadTokens(): TokenPayload | null {
  const p = getTokenPath();
  if (!fs.existsSync(p)) return null;
  try {
    const raw = fs.readFileSync(p, "utf8");
    return JSON.parse(raw) as TokenPayload;
  } catch {
    return null;
  }
}

export function saveTokens(tokens: TokenPayload): void {
  const p = getTokenPath();
  fs.writeFileSync(p, JSON.stringify(tokens, null, 2), "utf8");
}

export function clearTokens(): void {
  const p = getTokenPath();
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

import fs from "fs";
import type { TokenPayload } from "./types.js";
import { getTokenPath } from "../utils/paths.js";

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

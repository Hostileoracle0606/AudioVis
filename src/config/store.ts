/**
 * Minimal config store stub.
 * Real implementation pending — returns empty config so CLI commands that
 * call `loadConfig()` as a fallback-lookup don't crash at import time.
 */

export interface AppConfig {
  audio?: {
    macosDeviceName?: string;
  };
}

export function loadConfig(): AppConfig {
  return {};
}

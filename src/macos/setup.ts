/**
 * macOS setup — returns the preferred audio capture device name.
 */

export interface MacosReadyResult {
  deviceName: string;
}

export async function ensureMacosReady(): Promise<MacosReadyResult> {
  return { deviceName: "BlackHole 2ch" };
}

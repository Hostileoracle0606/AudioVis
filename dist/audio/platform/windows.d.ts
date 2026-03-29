/**
 * Windows audio capture via ffmpeg WASAPI loopback.
 *
 * Requirements:
 *   - ffmpeg must be installed and on PATH (winget install ffmpeg)
 *
 * By default this captures the default WASAPI loopback (system output).
 * You can specify a device name with --audio-device, e.g.:
 *   myviz visualizer --audio-device "Stereo Mix"
 *
 * To list available dshow devices:
 *   ffmpeg -list_devices true -f dshow -i dummy
 *
 * Implementation notes:
 *   ffmpeg is used with -f dshow and the loopback flag to capture
 *   system output audio as raw f32le mono PCM piped to stdout.
 *
 * WASAPI loopback alternative (if dshow fails):
 *   ffmpeg -f wasapi -loopback 1 -i default -ac 1 -ar <rate> -f f32le pipe:1
 */
import type { AudioSource, AudioSourceOptions } from "../AudioSource.js";
export declare function createWindowsAudioSource(opts: AudioSourceOptions): AudioSource;
//# sourceMappingURL=windows.d.ts.map
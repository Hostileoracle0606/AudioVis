/**
 * macOS audio capture via a virtual loopback device + ffmpeg or sox.
 *
 * IMPORTANT:
 *   macOS does NOT expose system audio output as a capturable input by default.
 *   You MUST install a virtual audio loopback driver such as BlackHole:
 *     https://github.com/ExistentialAudio/BlackHole
 *
 *   Then, in System Preferences → Sound (or Audio MIDI Setup), create a
 *   Multi-Output Device that routes to both your speakers and BlackHole.
 *   Set that Multi-Output Device as your system sound output.
 *
 *   Pass the BlackHole device to the visualizer:
 *     myviz visualizer --audio-device "BlackHole 2ch"
 *
 * This file uses ffmpeg with the avfoundation input format.
 * To list available avfoundation audio devices:
 *   ffmpeg -f avfoundation -list_devices true -i ""
 *
 * You may pass either the device name or its index:
 *   --audio-device "BlackHole 2ch"
 *   --audio-device ":1"   (where 1 is the device index from the list above)
 */
import type { AudioSource, AudioSourceOptions } from "../AudioSource.js";
export declare function createMacosAudioSource(opts: AudioSourceOptions): AudioSource;
//# sourceMappingURL=macos.d.ts.map
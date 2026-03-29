# audio-vis — Spotify ASCII Music Visualizer

A full-screen terminal music visualizer that reads playback metadata from the
Spotify Web API and drives the visualization from **local system audio capture**.

---

## Architecture overview

```
Spotify Web API ──► metadata / controls only
                         │
                         ▼
              ┌──────────────────────┐
              │   terminal UI         │
              │   (ANSI, full-screen) │
              └──────────────────────┘
                         ▲
Local audio output ──► loopback capture ──► FFT / DSP ──► visualizer
```

**Spotify does NOT provide raw audio data for this app.**
The visualization is driven entirely by capturing the audio your system is
already playing through its speakers/output.

---

## Prerequisites

### All platforms
- Node.js ≥ 18
- A Spotify Premium account (required for playback control API)
- A Spotify Developer app (free to create)

### Linux
- PulseAudio (`parecord`) **or** PipeWire with `pw-record` available in PATH.
  Usually pre-installed on modern desktop distros.
  ```
  which parecord   # should print /usr/bin/parecord
  ```

### macOS
macOS does not expose system audio loopback without a third-party driver.
Install **BlackHole** (free):
<https://github.com/ExistentialAudio/BlackHole>

Then create a **Multi-Output Device** in Audio MIDI Setup that sends to both
your real speakers and BlackHole. Set it as your system output. Pass the
BlackHole device name to the visualizer:

```
myviz visualizer --audio-device "BlackHole 2ch"
```

### Windows
The visualizer uses **WASAPI loopback** via `ffmpeg`. Install ffmpeg and ensure
it is on your PATH:

```
winget install ffmpeg
```

Then run:
```
myviz visualizer --audio-device "Stereo Mix"   # or your loopback device name
```

---

## Spotify setup

1. Go to <https://developer.spotify.com/dashboard> and create an app.
2. In the app settings, add this Redirect URI:
   ```
   http://localhost:8888/callback
   ```
3. Copy your **Client ID** and **Client Secret**.
4. Copy `.env.example` to `.env` and fill in the values:
   ```
   cp .env.example .env
   ```

---

## Installation

```bash
npm install
npm run build
npm link          # optional: makes `myviz` available globally
```

Or run directly with tsx (no build step):
```bash
npm run dev -- spotify login
npm run dev -- visualizer
```

---

## Commands

### Authentication
```bash
myviz spotify login          # opens browser, completes OAuth flow
```

### Playback info
```bash
myviz spotify current         # show currently playing track
myviz spotify devices         # list available Spotify devices
```

### Playback control
```bash
myviz spotify play
myviz spotify pause
myviz spotify next
myviz spotify prev
myviz spotify volume 75       # set volume to 75%
myviz spotify transfer <id>   # transfer playback to device by ID
```

### Visualizer
```bash
myviz visualizer
myviz visualizer --mode spectrum
myviz visualizer --mode wavefield --fps 30 --bars 32
myviz visualizer --audio-device "BlackHole 2ch"
myviz visualizer --fft-size 2048 --sample-rate 44100
myviz visualizer --ascii-safe    # use ASCII-only characters
myviz visualizer --no-color      # disable ANSI colour
```

---

## Keybindings (visualizer mode)

| Key   | Action           |
|-------|------------------|
| Space | Play / Pause     |
| n     | Next track       |
| p     | Previous track   |
| s     | Switch vis mode  |
| r     | Refresh metadata |
| q     | Quit             |

---

## Troubleshooting

### "No audio source found" / capture fails
- **Linux**: Make sure `parecord` is installed. Run `parecord --list-sources`
  to see available monitor devices. Pass the device name explicitly:
  ```
  myviz visualizer --audio-device alsa_output.pci-0000_00_1f.3.analog-stereo.monitor
  ```
- **macOS**: You must have a virtual loopback device. See the macOS section above.
- **Windows**: Ensure ffmpeg is installed and `Stereo Mix` is enabled in Sound
  settings → Recording devices.

### "No active Spotify device"
- Start playback in the Spotify desktop or mobile app first, then launch the
  visualizer. Or use `myviz spotify transfer <deviceId>` to move playback.

### Visualizer shows but no motion
- The app is capturing audio correctly but nothing is playing.
  Confirm Spotify is playing and your system audio output is routed through
  the loopback device.

### Token expired / auth errors
- Re-run `myviz spotify login` to refresh credentials.

---

## Development

```bash
npm run dev -- visualizer --mode spectrum
```

Source layout:
```
src/
  index.ts           entry point
  cli/               commander program + commands
  spotify/           Spotify OAuth + Web API client
  audio/             audio capture abstraction + platform backends
  dsp/               FFT, bucketing, smoothing, energy features
  ui/                terminal renderer, layout, theme, input
  visualizer/        engine, modes (wavefield + spectrum), state
  utils/             cleanup, env, errors, time
```

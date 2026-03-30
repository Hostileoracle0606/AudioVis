# Audio Vis

Audio Vis is a Spotify-connected terminal app that turns the music you are
currently playing into a full-screen ASCII visualizer. It combines Spotify
metadata and playback control with live system-audio capture, then renders the
result directly in the terminal with keyboard-driven controls.

This repository contains both:

- the Node.js/TypeScript source for the CLI app
- a macOS packaging flow that builds a self-contained `.app` bundle for
  distribution

## What The App Does

Audio Vis is not a Spotify player replacement. Instead, it sits alongside your
existing Spotify playback and adds a visual layer in the terminal.

At runtime, the app:

1. Authenticates with the Spotify Web API.
2. Reads the currently playing track, playback state, album info, and active
   device.
3. Captures the audio already coming out of your machine.
4. Runs FFT/DSP analysis on that audio stream.
5. Renders one of several ASCII visualization modes in a full-screen terminal
   UI.
6. Lets you control playback without leaving the visualizer.

Key capabilities:

- Live Spotify metadata in the header
- Play, pause, next, previous, transfer, and volume control
- Multiple visualization modes: `wavefield`, `scroll`, `spectrum`
- Album art converted into ASCII inside the visualizer
- Guided first-run setup flow on macOS
- Self-contained macOS app packaging with bundled Node and `ffmpeg`

## Important Architecture Note

Spotify does not provide raw audio to this app.

Audio Vis uses Spotify only for:

- authentication
- playback metadata
- playback control

The actual visualization is driven by local loopback audio capture from your
computer's output device.

High-level flow:

```text
Spotify Web API -> track metadata + playback control
                              |
                              v
                    terminal application
                              ^
                              |
system audio output -> loopback capture -> FFT/DSP -> ASCII rendering
```

## User Experience Walkthrough

### First run

On a fresh install, the app needs:

- Spotify Developer credentials
- Spotify user authorization
- a working loopback audio setup for your OS

On macOS, `myviz setup` and `myviz launch` guide the user through this flow.
The assistant can:

- ask for Spotify Client ID and Client Secret if they were not bundled
- detect a BlackHole device
- open a bundled BlackHole installer if included in the app package
- open Audio MIDI Setup so the user can create or verify a Multi-Output Device
- remember the selected macOS audio device in app config

### During use

Once running, the visualizer shows:

- current track and artist
- playback state and progress bar
- active Spotify device
- animated visualization based on the live audio signal
- album art thumbnail and optional full ASCII album-art mode

Supported in-visualizer controls:

- `space`: play/pause
- `n`: next track
- `p`: previous track
- `s`: cycle visualization mode
- `a`: toggle album-art mode
- `r`: refresh Spotify metadata
- `q`: quit
- `Ctrl+C`: quit

## Repository Overview

Main areas of the codebase:

- `src/cli`: CLI commands and command registration
- `src/spotify`: Spotify OAuth, token storage, and API calls
- `src/audio`: platform-specific audio capture backends
- `src/dsp`: FFT, smoothing, energy extraction, and bucket generation
- `src/visualizer`: render engine and visual modes
- `src/ui`: terminal rendering, layout, formatting, and input handling
- `src/macos`: guided macOS setup assistant
- `src/config`: persisted app configuration
- `scripts/build-macos-app.mjs`: macOS app bundle packaging script

## Requirements

### All platforms

- Node.js 18+
- npm
- a Spotify account
- Spotify Premium for playback control features
- a Spotify Developer app

### Linux

The visualizer expects a working monitor/loopback source, usually via
PulseAudio or PipeWire tooling.

Typical requirement:

- `parecord` or `pw-record` available on `PATH`

### macOS

macOS requires a loopback device such as BlackHole.

Recommended:

- [BlackHole](https://github.com/ExistentialAudio/BlackHole)
- a Multi-Output Device configured in Audio MIDI Setup

### Windows

Windows capture uses `ffmpeg` with WASAPI loopback.

Typical requirement:

- `ffmpeg` available on `PATH`
- a usable loopback input such as `Stereo Mix`, depending on the machine

## Spotify Developer Setup

Create a Spotify app at
[developer.spotify.com/dashboard](https://developer.spotify.com/dashboard).

Configure this redirect URI:

```text
http://127.0.0.1:8888/callback
```

Then copy the sample environment file:

```bash
cp .env.example .env
```

Fill in:

```env
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
SPOTIFY_REDIRECT_URI=http://127.0.0.1:8888/callback
```

## Local Development

Install dependencies:

```bash
npm install
```

Build the TypeScript output:

```bash
npm run build
```

Run the CLI in development mode:

```bash
npm run dev -- spotify login
npm run dev -- visualizer
```

Run the built app:

```bash
npm run start -- visualizer
```

Optionally link the CLI globally:

```bash
npm link
```

That exposes the `myviz` command locally.

## CLI Commands

### Authentication and setup

```bash
myviz spotify login
myviz setup
myviz launch
```

### Playback inspection

```bash
myviz spotify current
myviz spotify devices
```

### Playback control

```bash
myviz spotify play
myviz spotify pause
myviz spotify next
myviz spotify prev
myviz spotify volume 75
myviz spotify transfer <device-id>
```

### Visualizer

```bash
myviz visualizer
myviz visualizer --mode spectrum
myviz visualizer --mode scroll --fps 30 --bars 32
myviz visualizer --audio-device "BlackHole 2ch"
myviz visualizer --fft-size 2048 --sample-rate 44100
myviz visualizer --ascii-safe
myviz visualizer --no-color
myviz visualizer --silent
```

Notes:

- `--silent` is useful for testing the UI when audio capture is not available.
- On macOS, the visualizer will reuse the saved loopback device from config if
  one was stored during setup.

## Configuration And Stored Data

Audio Vis stores local state outside the repo.

Default config locations:

- macOS: `~/Library/Application Support/Audio Vis`
- Linux and other non-macOS platforms: `~/.config/audio-vis`

Important files:

- `config.json`: saved Spotify app settings and macOS audio setup state
- `spotify-tokens.json`: Spotify OAuth access and refresh tokens

The packaged macOS app sets `AUDIO_VIS_HOME` automatically so user state is
stored in the standard macOS Application Support folder.

## Deployment And Distribution

For this project, "deployment" means packaging and distributing the desktop app
or shipping the CLI, not deploying a web server.

There are two main delivery paths.

### Option 1: Run from source

Best for:

- development
- internal use
- contributors

Workflow:

1. Clone the repo.
2. Run `npm install`.
3. Create `.env`.
4. Run `npm run build`.
5. Start with `npm run dev -- launch` or `npm run start -- launch`.

### Option 2: Build and distribute the macOS app

Best for:

- non-technical users
- demos
- direct desktop distribution

Build the packaged app:

```bash
npm install
npm run build:macos-app
```

Note: `build:macos-app` must be run on macOS.

Artifacts:

- `build/macos/Audio Vis.app`
- `build/macos/Audio Vis.zip`

What the macOS package bundles:

- the built app in `dist/`
- production dependencies from `node_modules/`
- a Node runtime copied from the build machine
- a bundled `ffmpeg` binary
- an optional bundled BlackHole installer
- optional default Spotify credentials for distributors

What happens when a user opens the packaged app:

1. The app launches Terminal.
2. Terminal runs the packaged `launch` flow.
3. If needed, the user completes Spotify credential entry.
4. If needed, BlackHole installation is offered.
5. The user is guided through macOS routing setup.
6. Browser login opens for Spotify authorization if no tokens are saved.
7. The visualizer starts.

### Bundling distributor Spotify credentials

If you want the macOS app to ship with preset Spotify app credentials, build
with these environment variables:

```bash
AUDIO_VIS_DIST_SPOTIFY_CLIENT_ID=your_client_id \
AUDIO_VIS_DIST_SPOTIFY_CLIENT_SECRET=your_client_secret \
npm run build:macos-app
```

This writes a packaged default config into the app bundle so end users do not
need to enter those values manually.

### Bundling a BlackHole installer

If you want the packaged macOS app to offer BlackHole during first launch:

1. Place the installer at `vendor/BlackHole.pkg`
2. Run `npm run build:macos-app`

If present, the packaging script copies it into the app bundle and the setup
assistant can open it automatically.

## Platform Setup Notes

### macOS

Typical user flow:

1. Install BlackHole.
2. Open Audio MIDI Setup.
3. Create a Multi-Output Device containing both:
   - your speakers or headphones
   - BlackHole
4. Set that Multi-Output Device as the current macOS output.
5. Run `myviz launch`.

If the setup assistant has already saved the BlackHole device name, later runs
reuse it automatically.

### Linux

Make sure a loopback/monitor source exists and identify it before launching.

Example:

```bash
parecord --list-sources
myviz visualizer --audio-device alsa_output.pci-0000_00_1f.3.analog-stereo.monitor
```

### Windows

Install `ffmpeg` and confirm the loopback input/device you want to capture.

Example:

```bash
winget install ffmpeg
myviz visualizer --audio-device "Stereo Mix"
```

## How The Visualizer Works

At a high level:

1. Audio frames are captured from a platform-specific input backend.
2. The app computes a magnitude spectrum with FFT.
3. Magnitudes are grouped into buckets and smoothed.
4. Additional features such as low, mid, high, RMS, and pulse are extracted.
5. The renderer draws one frame of the selected mode.
6. Spotify metadata is polled separately so track details stay current.

The render loop targets the configured FPS, while Spotify metadata is refreshed
roughly once per second.

## Troubleshooting

### No movement in the visualizer

Usually this means the UI is running but the audio source is not receiving
signal.

Check:

- music is actually playing
- the correct loopback device is selected
- your system output is routed through the loopback path

### No active Spotify device found

Start playback in Spotify first, then retry. If needed, inspect devices with:

```bash
myviz spotify devices
```

Then transfer playback:

```bash
myviz spotify transfer <device-id>
```

### Spotify login or token issues

Re-run:

```bash
myviz spotify login
```

Also confirm the redirect URI in Spotify matches exactly:

```text
http://127.0.0.1:8888/callback
```

### Spotify `403` on Spotify metadata enrichment

Spotify can allow playback/device endpoints while denying enrichment endpoints
such as `/artists`, `/audio-features/{id}`, or `/audio-analysis/{id}` for some
apps or accounts. Audio Vis treats those endpoints as optional, so the
visualizer can keep running with live playback data even when those requests
are blocked.

If playback control commands like `play`, `pause`, `next`, or `volume` return
`403`, that usually means the account does not have the Spotify access level
required for playback control.

### macOS audio capture does not work

Confirm:

- BlackHole is installed
- BlackHole appears in the device list
- a Multi-Output Device is configured
- macOS output is currently using that Multi-Output Device

### Windows capture fails

Confirm:

- `ffmpeg` is installed and available on `PATH`
- the chosen capture device exists
- loopback capture is enabled on the machine

### Linux capture fails

Confirm:

- `parecord` or the required capture tool is installed
- the selected monitor source exists
- audio is routed through the source you are capturing

## Packaging Script Summary

The macOS packaging script in
[`scripts/build-macos-app.mjs`](/Users/trinabgoswamy/Audio-vis/scripts/build-macos-app.mjs)
does the following:

- runs the TypeScript build
- creates a macOS `.app` bundle structure
- copies the built app and dependencies into the bundle
- copies the current Node executable into the bundle
- copies `ffmpeg-static` into the bundle
- optionally copies `vendor/BlackHole.pkg`
- optionally writes bundled Spotify defaults
- writes the bundle launcher scripts
- zips the final `.app` for distribution

## Future Documentation Ideas

Useful additions later, if we want to expand the docs:

- screenshots or terminal captures of each visualization mode
- contributor setup and architecture diagrams by subsystem
- release process notes for shipping signed/notarized macOS builds
- Linux and Windows packaging guides

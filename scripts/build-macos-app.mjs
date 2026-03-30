#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";
import ffmpegStatic from "ffmpeg-static";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const appName = "Audio Vis";
const buildDir = path.join(repoRoot, "build", "macos");
const bundleRoot = path.join(buildDir, `${appName}.app`);
const contentsDir = path.join(bundleRoot, "Contents");
const macosDir = path.join(contentsDir, "MacOS");
const resourcesDir = path.join(contentsDir, "Resources");
const appDir = path.join(resourcesDir, "app");
const binDir = path.join(resourcesDir, "bin");
const installersDir = path.join(resourcesDir, "installers");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: "inherit",
    ...options,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function copyDir(source, destination) {
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const src = path.join(source, entry.name);
    const dest = path.join(destination, entry.name);
    if (entry.isDirectory()) {
      copyDir(src, dest);
    } else if (entry.isSymbolicLink()) {
      fs.symlinkSync(fs.readlinkSync(src), dest);
    } else {
      fs.copyFileSync(src, dest);
    }
  }
}

function writeExecutable(filePath, content) {
  fs.writeFileSync(filePath, content, "utf8");
  fs.chmodSync(filePath, 0o755);
}

if (process.platform !== "darwin") {
  console.error("build:macos-app can only run on macOS.");
  process.exit(1);
}

run("npm", ["run", "build"]);

fs.rmSync(buildDir, { recursive: true, force: true });
fs.mkdirSync(macosDir, { recursive: true });
fs.mkdirSync(binDir, { recursive: true });
fs.mkdirSync(installersDir, { recursive: true });

copyDir(path.join(repoRoot, "dist"), path.join(appDir, "dist"));
copyDir(path.join(repoRoot, "node_modules"), path.join(appDir, "node_modules"));
fs.copyFileSync(path.join(repoRoot, "package.json"), path.join(appDir, "package.json"));

fs.copyFileSync(process.execPath, path.join(binDir, "node"));
fs.chmodSync(path.join(binDir, "node"), 0o755);

if (!ffmpegStatic || !fs.existsSync(ffmpegStatic)) {
  console.error("Unable to locate ffmpeg-static for bundling.");
  process.exit(1);
}
fs.copyFileSync(ffmpegStatic, path.join(binDir, "ffmpeg"));
fs.chmodSync(path.join(binDir, "ffmpeg"), 0o755);

const bundledBlackHolePkg = path.join(repoRoot, "vendor", "BlackHole.pkg");
if (fs.existsSync(bundledBlackHolePkg)) {
  fs.copyFileSync(
    bundledBlackHolePkg,
    path.join(installersDir, "BlackHole.pkg")
  );
}

const distributorClientId = process.env.AUDIO_VIS_DIST_SPOTIFY_CLIENT_ID;
const distributorClientSecret = process.env.AUDIO_VIS_DIST_SPOTIFY_CLIENT_SECRET;
if (distributorClientId && distributorClientSecret) {
  fs.writeFileSync(
    path.join(appDir, "default-config.json"),
    JSON.stringify(
      {
        spotify: {
          clientId: distributorClientId,
          clientSecret: distributorClientSecret,
          redirectUri: "http://127.0.0.1:8888/callback",
          callbackPort: 8888,
        },
      },
      null,
      2
    ) + "\n",
    "utf8"
  );
}

fs.writeFileSync(
  path.join(contentsDir, "Info.plist"),
  `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>en</string>
  <key>CFBundleExecutable</key>
  <string>audio-vis-launcher</string>
  <key>CFBundleIdentifier</key>
  <string>com.audiovis.app</string>
  <key>CFBundleName</key>
  <string>${appName}</string>
  <key>CFBundleDisplayName</key>
  <string>${appName}</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0.0</string>
  <key>CFBundleVersion</key>
  <string>1</string>
  <key>LSMinimumSystemVersion</key>
  <string>13.0</string>
</dict>
</plist>
`,
  "utf8"
);

writeExecutable(
  path.join(binDir, "run-audio-vis.sh"),
  `#!/bin/zsh
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RESOURCES_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
APP_DIR="$RESOURCES_DIR/app"
export AUDIO_VIS_HOME="$HOME/Library/Application Support/${appName}"
export AUDIO_VIS_FFMPEG_PATH="$SCRIPT_DIR/ffmpeg"
export AUDIO_VIS_DEFAULT_CONFIG_PATH="$APP_DIR/default-config.json"
export AUDIO_VIS_APP_BUNDLE="1"
if [[ -f "$RESOURCES_DIR/installers/BlackHole.pkg" ]]; then
  export AUDIO_VIS_BLACKHOLE_PKG="$RESOURCES_DIR/installers/BlackHole.pkg"
fi
cd "$APP_DIR"
exec "$SCRIPT_DIR/node" "$APP_DIR/dist/index.js" launch --app "$@"
`
);

writeExecutable(
  path.join(macosDir, "audio-vis-launcher"),
  `#!/bin/zsh
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RUN_SCRIPT="$SCRIPT_DIR/../Resources/bin/run-audio-vis.sh"
/usr/bin/osascript <<OSA
tell application "Terminal"
  activate
  do script quoted form of POSIX path of "$RUN_SCRIPT"
end tell
OSA
`
);

run("ditto", [
  "-c",
  "-k",
  "--sequesterRsrc",
  "--keepParent",
  bundleRoot,
  path.join(buildDir, `${appName}.zip`),
]);

console.log(`Created ${bundleRoot}`);
console.log(`Created ${path.join(buildDir, `${appName}.zip`)}`);

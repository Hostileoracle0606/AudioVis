import fs from "fs";
import ffmpegStatic from "ffmpeg-static";

export function resolveFfmpegBinary(): string {
  const configuredPath = process.env.AUDIO_VIS_FFMPEG_PATH;
  if (configuredPath && fs.existsSync(configuredPath)) {
    return configuredPath;
  }

  if (ffmpegStatic && fs.existsSync(ffmpegStatic)) {
    return ffmpegStatic;
  }

  return "ffmpeg";
}

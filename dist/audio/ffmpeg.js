"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveFfmpegBinary = resolveFfmpegBinary;
const fs_1 = __importDefault(require("fs"));
const ffmpeg_static_1 = __importDefault(require("ffmpeg-static"));
function resolveFfmpegBinary() {
    const configuredPath = process.env.AUDIO_VIS_FFMPEG_PATH;
    if (configuredPath && fs_1.default.existsSync(configuredPath)) {
        return configuredPath;
    }
    if (ffmpeg_static_1.default && fs_1.default.existsSync(ffmpeg_static_1.default)) {
        return ffmpeg_static_1.default;
    }
    return "ffmpeg";
}
//# sourceMappingURL=ffmpeg.js.map
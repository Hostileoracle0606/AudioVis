"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const setup_js_1 = require("./setup.js");
const SAMPLE_AUDIO_OUTPUT = `Audio:

    Devices:

        BlackHole 2ch:

          Input Channels: 2
          Output Channels: 2

        MacBook Air Speakers:

          Default Output Device: Yes
          Default System Output Device: Yes
          Output Channels: 2

        Multi-Output Device:

          Output Channels: 2
`;
(0, node_test_1.default)("parseSystemProfilerAudioDevices detects default output device", () => {
    const devices = (0, setup_js_1.parseSystemProfilerAudioDevices)(SAMPLE_AUDIO_OUTPUT);
    strict_1.default.equal(devices.length, 3);
    strict_1.default.equal(devices[1]?.name, "MacBook Air Speakers");
    strict_1.default.equal(devices[1]?.isDefaultOutput, true);
    strict_1.default.equal(devices[1]?.isDefaultSystemOutput, true);
});
(0, node_test_1.default)("getAudioRoutingStatus flags unrouted speaker output", () => {
    const devices = (0, setup_js_1.parseSystemProfilerAudioDevices)(SAMPLE_AUDIO_OUTPUT);
    const status = (0, setup_js_1.getAudioRoutingStatus)("BlackHole 2ch", devices);
    strict_1.default.equal(status.routed, false);
    strict_1.default.equal(status.defaultOutputName, "MacBook Air Speakers");
    strict_1.default.match(status.message, /Route playback through BlackHole 2ch/i);
});
(0, node_test_1.default)("getAudioRoutingStatus accepts a Multi-Output default", () => {
    const devices = (0, setup_js_1.parseSystemProfilerAudioDevices)(`
Audio:

    Devices:

        Multi-Output Device:

          Default Output Device: Yes
          Default System Output Device: Yes
          Output Channels: 2
`);
    const status = (0, setup_js_1.getAudioRoutingStatus)("BlackHole 2ch", devices);
    strict_1.default.equal(status.routed, true);
    strict_1.default.equal(status.defaultOutputName, "Multi-Output Device");
});
//# sourceMappingURL=setup.test.js.map
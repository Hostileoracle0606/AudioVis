"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildProgram = buildProgram;
const commander_1 = require("commander");
const spotifyLogin_js_1 = require("./commands/spotifyLogin.js");
const spotifyCurrent_js_1 = require("./commands/spotifyCurrent.js");
const spotifyDevices_js_1 = require("./commands/spotifyDevices.js");
const spotifyPlay_js_1 = require("./commands/spotifyPlay.js");
const spotifyPause_js_1 = require("./commands/spotifyPause.js");
const spotifyNext_js_1 = require("./commands/spotifyNext.js");
const spotifyPrev_js_1 = require("./commands/spotifyPrev.js");
const spotifyVolume_js_1 = require("./commands/spotifyVolume.js");
const spotifyTransfer_js_1 = require("./commands/spotifyTransfer.js");
const launch_js_1 = require("./commands/launch.js");
const setup_js_1 = require("./commands/setup.js");
const visualizer_js_1 = require("./commands/visualizer.js");
function buildProgram() {
    const program = new commander_1.Command();
    program
        .name("myviz")
        .description("Spotify-connected ASCII music visualizer")
        .version("1.0.0");
    // -- spotify sub-command group --
    const spotify = new commander_1.Command("spotify").description("Spotify playback control and metadata");
    (0, spotifyLogin_js_1.registerSpotifyLogin)(spotify);
    (0, spotifyCurrent_js_1.registerSpotifyCurrent)(spotify);
    (0, spotifyDevices_js_1.registerSpotifyDevices)(spotify);
    (0, spotifyPlay_js_1.registerSpotifyPlay)(spotify);
    (0, spotifyPause_js_1.registerSpotifyPause)(spotify);
    (0, spotifyNext_js_1.registerSpotifyNext)(spotify);
    (0, spotifyPrev_js_1.registerSpotifyPrev)(spotify);
    (0, spotifyVolume_js_1.registerSpotifyVolume)(spotify);
    (0, spotifyTransfer_js_1.registerSpotifyTransfer)(spotify);
    program.addCommand(spotify);
    // -- visualizer --
    (0, visualizer_js_1.registerVisualizer)(program);
    (0, setup_js_1.registerSetup)(program);
    (0, launch_js_1.registerLaunch)(program);
    return program;
}
//# sourceMappingURL=program.js.map
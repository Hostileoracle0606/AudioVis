import { Command } from "commander";
import { registerSpotifyLogin } from "./commands/spotifyLogin.js";
import { registerSpotifyCurrent } from "./commands/spotifyCurrent.js";
import { registerSpotifyDevices } from "./commands/spotifyDevices.js";
import { registerSpotifyPlay } from "./commands/spotifyPlay.js";
import { registerSpotifyPause } from "./commands/spotifyPause.js";
import { registerSpotifyNext } from "./commands/spotifyNext.js";
import { registerSpotifyPrev } from "./commands/spotifyPrev.js";
import { registerSpotifyVolume } from "./commands/spotifyVolume.js";
import { registerSpotifyTransfer } from "./commands/spotifyTransfer.js";
import { registerVisualizer } from "./commands/visualizer.js";

export function buildProgram(): Command {
  const program = new Command();

  program
    .name("myviz")
    .description("Spotify-connected ASCII music visualizer")
    .version("1.0.0");

  // -- spotify sub-command group --
  const spotify = new Command("spotify").description(
    "Spotify playback control and metadata"
  );

  registerSpotifyLogin(spotify);
  registerSpotifyCurrent(spotify);
  registerSpotifyDevices(spotify);
  registerSpotifyPlay(spotify);
  registerSpotifyPause(spotify);
  registerSpotifyNext(spotify);
  registerSpotifyPrev(spotify);
  registerSpotifyVolume(spotify);
  registerSpotifyTransfer(spotify);

  program.addCommand(spotify);

  // -- visualizer --
  registerVisualizer(program);

  return program;
}

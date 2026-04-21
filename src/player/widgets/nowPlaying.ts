import type { Renderer } from "../../ui/renderer.js";
import type { Region } from "../../ui/tui.js";
import type { AppState } from "../state.js";
import type { Theme } from "../theme.js";
import { computeDna, catalogNumber } from "../trackDna.js";

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, Math.max(0, max - 1)) + "\u2026";
}

function vuBar(level: number, width: number): string {
  const clamped = Math.max(0, Math.min(1, level));
  const fill = Math.round(clamped * width);
  let out = "";
  for (let i = 0; i < width; i++) {
    out += i < fill ? "\u2588" : "\u00B7";
  }
  return out;
}

function gauge(value: number, width: number): string {
  const fill = Math.round((value / 100) * width);
  let out = "";
  for (let i = 0; i < width; i++) out += i < fill ? "\u25AE" : "\u25AF";
  return out;
}

function dotRule(label: string, width: number, theme: Theme): string {
  const inner = ` ${label} `;
  const dashes = Math.max(0, width - inner.length);
  const left = Math.floor(dashes / 2);
  const right = dashes - left;
  return `${theme.dim}${"\u00B7".repeat(left)}${inner}${"\u00B7".repeat(right)}${theme.reset}`;
}

export function renderNowPlaying(
  r: Renderer,
  region: Region,
  state: AppState,
  theme: Theme,
): void {
  if (region.width < 24 || region.height < 12) return;

  const xi = region.x + 2;
  const pad = region.width - 4;
  const np = state.nowPlaying;

  const cat = np ? catalogNumber(`${np.trackName}|${np.artistName}`) : "000";
  r.write(xi, region.y, `${theme.dim}[ now \u00B7 track ${cat} ]${theme.reset}`);

  if (!np) {
    r.write(xi, region.y + 2, `${theme.dim}\u2014 no track \u2014${theme.reset}`);
    return;
  }

  r.write(xi, region.y + 1, `${theme.fg}\u25B8 ${truncate(np.trackName, pad - 2)}${theme.reset}`);
  r.write(xi, region.y + 2, `${theme.dim}\u25E6 ${truncate(np.artistName, pad - 2)}${theme.reset}`);

  r.write(xi, region.y + 3, dotRule("track dna", pad, theme));
  const dna = computeDna(`${np.trackName}|${np.artistName}`);
  r.write(xi, region.y + 4,
    `${theme.dim}bpm ${dna.bpm} \u00B7 key ${dna.key}${dna.keyMode === "min" ? "m" : ""} \u00B7 ${dna.lufs} lufs${theme.reset}`);
  r.write(xi, region.y + 5,
    `${theme.dim}eng ${gauge(dna.energy, 7)} ${String(dna.energy).padStart(2," ")}  val ${gauge(dna.valence, 7)} ${String(dna.valence).padStart(2," ")}${theme.reset}`);
  r.write(xi, region.y + 6,
    `${theme.dim}dan ${gauge(dna.danceability, 7)} ${String(dna.danceability).padStart(2," ")}  aco ${gauge(dna.acousticness, 7)} ${String(dna.acousticness).padStart(2," ")}${theme.reset}`);

  r.write(xi, region.y + 7, dotRule("meter strip", pad, theme));
  const barW = Math.max(6, pad - 10);
  const lPct = Math.round(state.meterL * 100).toString().padStart(3, " ") + "%";
  const rPct = Math.round(state.meterR * 100).toString().padStart(3, " ") + "%";
  r.write(xi, region.y + 8, `${theme.dim}L ${theme.meter}${vuBar(state.meterL, barW)}${theme.dim} ${lPct}${theme.reset}`);
  r.write(xi, region.y + 9, `${theme.dim}R ${theme.meter}${vuBar(state.meterR, barW)}${theme.dim} ${rPct}${theme.reset}`);
  const peakDb = Math.max(state.meterL, state.meterR) > 0
    ? (20 * Math.log10(Math.max(state.meterL, state.meterR))).toFixed(1)
    : "-inf";
  r.write(xi, region.y + 10, `${theme.dim}\u25E6peak ${peakDb} \u25E6clip 0 \u25E6lim 0${theme.reset}`);

  if (region.height >= 13) {
    r.write(xi, region.y + 11, dotRule("transport", pad, theme));
    const playGlyph = state.isPlaying ? "\u25B7" : "\u25AF\u25AF";
    r.write(xi, region.y + 12, `${theme.fg}[${playGlyph} play] [\u25A0 stop] [\u25C9 rec] [\u27F2]${theme.reset}`);
  }
  if (region.height >= 14) {
    r.write(xi, region.y + 13, `${theme.dim}pgm 01 \u00B7 bnk a \u00B7 ${dna.bpm}bpm \u00B7 ${dna.key}${theme.reset}`);
  }
}

import type { Renderer } from "../../ui/renderer.js";
import type { Region } from "../../ui/tui.js";
import type { AppState } from "../state.js";
import type { Theme } from "../theme.js";
import { catalogNumber } from "../trackDna.js";

const TL = "\u256D", TR = "\u256E", BL = "\u2570", BR = "\u256F";
const H = "\u2500", V = "\u2502";

export function renderAlbumArt(
  r: Renderer,
  region: Region,
  state: AppState,
  theme: Theme,
): void {
  const head = state.recentlyPlayed[0];
  const idSrc = head ? `${head.trackName}|${head.artistName}` : "unknown";
  const cat = catalogNumber(idSrc);
  const label = `[ screen \u00B7 ${cat} ]`;

  const frameX = region.x + 1;
  const frameY = region.y;
  const frameW = region.width - 2;
  const frameH = region.height - 5;

  if (frameW < 6 || frameH < 3) return;

  const labelPad = Math.max(0, frameW - label.length - 4);
  r.write(frameX, frameY, `${theme.dim}${TL}${H}${label}${H.repeat(labelPad)}${H}${TR}${theme.reset}`);

  for (let y = frameY + 1; y < frameY + frameH - 1; y++) {
    r.write(frameX, y, `${theme.dim}${V}${theme.reset}`);
    r.write(frameX + frameW - 1, y, `${theme.dim}${V}${theme.reset}`);
  }
  r.write(frameX, frameY + frameH - 1, `${theme.dim}${BL}${H.repeat(frameW - 2)}${BR}${theme.reset}`);

  const artX = frameX + 1;
  const artY = frameY + 1;
  const artW = frameW - 2;
  const artH = frameH - 2;

  if (state.artCellMode === "blank") {
    const msg = "[ OFF ]";
    const cx = artX + Math.floor((artW - msg.length) / 2);
    const cy = artY + Math.floor(artH / 2);
    r.write(cx, cy, `${theme.dim}${msg}${theme.reset}`);
  } else if (state.artCellMode === "vu") {
    const lvl = Math.round((state.meterL + state.meterR) / 2 * artH);
    for (let row = 0; row < artH; row++) {
      const y = artY + artH - 1 - row;
      const ch = row < lvl ? "\u2588".repeat(artW) : " ".repeat(artW);
      r.write(artX, y, `${theme.meter}${ch}${theme.reset}`);
    }
  } else {
    const art = state.albumArt;
    if (!art) {
      const msg = "\u2014 no art \u2014";
      const cx = artX + Math.floor((artW - msg.length) / 2);
      const cy = artY + Math.floor(artH / 2);
      r.write(cx, cy, `${theme.dim}${msg}${theme.reset}`);
    } else {
      const lines = art.lines;
      for (let i = 0; i < Math.min(artH, lines.length); i++) {
        r.write(artX, artY + i, lines[i]);
      }
    }
  }

  const fy = frameY + frameH;
  const fx = frameX;
  const fw = frameW;
  const pad = "\u00B7".repeat(Math.max(0, fw - 4));
  r.write(fx, fy, `${theme.dim}  \u25E6 ansilize \u00B7 2\u00D74 braille${theme.reset}`);
  r.write(fx, fy + 1, `${theme.dim}  \u25CF peak hold  \u00B7 \u25CF over  \u00B7 \u25CF lim${theme.reset}`);
  const rmsTxt = state.rms.toFixed(2);
  r.write(fx, fy + 2, `${theme.dim}  \u25E6 rms ${rmsTxt}  \u25E6 lufs ${Math.round(-20 + state.rms * 14)}${theme.reset}`);
  r.write(fx, fy + 3, `${theme.dim}  ${pad.slice(0, fw - 4)}${theme.reset}`);
}

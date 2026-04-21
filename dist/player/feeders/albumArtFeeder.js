"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchAlbumArt = fetchAlbumArt;
const fetcher_js_1 = require("../../album/fetcher.js");
const converter_js_1 = require("../../album/converter.js");
const cache_js_1 = require("../../album/cache.js");
async function fetchAlbumArt(state, url, cellCols, cellRows, noColor) {
    if (!url) {
        state.albumArt = null;
        return;
    }
    const cacheKey = `${url}::${cellCols}x${cellRows}::${noColor ? "mono" : "color"}`;
    const cached = (0, cache_js_1.getCached)(cacheKey);
    if (cached) {
        state.albumArt = cached;
        state.padFingerprints[0] = cached.padFingerprint;
        state.activePadIndex = 0;
        return;
    }
    try {
        const buf = await (0, fetcher_js_1.fetchImageBuffer)(url);
        const art = await (0, converter_js_1.convertToAscii)(buf, cacheKey, cellCols * 2, cellRows * 2, noColor, cellCols, cellRows);
        (0, cache_js_1.setCached)(cacheKey, art);
        state.albumArt = art;
        state.padFingerprints[0] = art.padFingerprint;
        state.activePadIndex = 0;
    }
    catch {
        state.albumArt = null;
    }
}
//# sourceMappingURL=albumArtFeeder.js.map
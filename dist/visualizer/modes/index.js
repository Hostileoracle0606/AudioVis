"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VISUALIZER_MODE_ORDER = void 0;
exports.getVisualizerMode = getVisualizerMode;
exports.isVisualizerMode = isVisualizerMode;
const state_js_1 = require("../state.js");
const fire_js_1 = require("./fire.js");
const scroll_js_1 = require("./scroll.js");
const skyline_js_1 = require("./skyline.js");
const spectrum_js_1 = require("./spectrum.js");
const topographic_js_1 = require("./topographic.js");
const tunnel_js_1 = require("./tunnel.js");
const wavefield_js_1 = require("./wavefield.js");
const MODE_DEFINITIONS = {
    wavefield: {
        id: "wavefield",
        label: "Wavefield",
        render: wavefield_js_1.renderWavefield,
    },
    scroll: {
        id: "scroll",
        label: "Scroll",
        prepare: (state, region) => (0, scroll_js_1.prepareScroll)(state, region.width),
        render: scroll_js_1.renderScroll,
    },
    spectrum: {
        id: "spectrum",
        label: "Spectrum",
        render: spectrum_js_1.renderSpectrum,
    },
    skyline: {
        id: "skyline",
        label: "Skyline",
        render: skyline_js_1.renderSkyline,
    },
    fire: {
        id: "fire",
        label: "Fire",
        prepare: fire_js_1.prepareFire,
        render: fire_js_1.renderFire,
    },
    tunnel: {
        id: "tunnel",
        label: "Tunnel",
        prepare: tunnel_js_1.prepareTunnel,
        render: tunnel_js_1.renderTunnel,
    },
    topographic: {
        id: "topographic",
        label: "Topographic",
        render: topographic_js_1.renderTopographic,
    },
};
exports.VISUALIZER_MODE_ORDER = state_js_1.VIS_MODE_IDS;
function getVisualizerMode(mode) {
    return MODE_DEFINITIONS[mode];
}
function isVisualizerMode(value) {
    return state_js_1.VIS_MODE_IDS.includes(value);
}
//# sourceMappingURL=index.js.map
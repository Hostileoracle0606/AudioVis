"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VIS_MODE_IDS = void 0;
exports.createInitialState = createInitialState;
exports.VIS_MODE_IDS = [
    "wavefield",
    "scroll",
    "spectrum",
    "skyline",
    "fire",
    "tunnel",
    "topographic",
];
function createInitialState(mode, numBars, cols, rows) {
    const initialStyle = {
        label: "steady glow",
        confidence: 0,
        glitch: 0.2,
        neon: 0.35,
        organic: 0.3,
        metallic: 0.15,
        softness: 0.4,
        aggression: 0.2,
        density: 0.25,
        groove: 0.3,
        darkness: 0.25,
        dominantPitchClass: 4,
        dominantPitchLabel: "E",
        hue: 120,
        saturation: 0.45,
        brightness: 0.4,
        genreHints: [],
    };
    return {
        mode,
        smoothedBuckets: new Float32Array(numBars),
        rawBuckets: new Float32Array(numBars),
        low: 0,
        mid: 0,
        high: 0,
        amplitude: 0,
        pulse: 0,
        trackName: "",
        artistName: "",
        albumName: "",
        appName: "Spotify",
        isPlaying: false,
        progressMs: 0,
        durationMs: 0,
        statusMessage: "",
        analysisFrame: {
            segment: null,
            tatumProgress: 0,
            beatProgress: 0,
            sectionProgress: 0,
            sectionTransition: 0,
        },
        styleProfile: initialStyle,
        pitchHue: initialStyle.hue,
        targetPitchHue: initialStyle.hue,
        pitchSaturation: initialStyle.saturation,
        cols,
        rows,
        startTime: Date.now(),
        numBars,
        modeData: {},
    };
}
//# sourceMappingURL=state.js.map
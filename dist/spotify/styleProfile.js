"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inferStyleProfile = inferStyleProfile;
exports.smoothStyleProfile = smoothStyleProfile;
exports.buildAnalysisFrame = buildAnalysisFrame;
const PITCH_LABELS = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
];
function clamp01(value) {
    return Math.max(0, Math.min(1, value));
}
function average(values) {
    if (values.length === 0)
        return 0;
    let sum = 0;
    for (const value of values)
        sum += value;
    return sum / values.length;
}
function meanAbsolute(values) {
    if (values.length === 0)
        return 0;
    let sum = 0;
    for (const value of values)
        sum += Math.abs(value);
    return sum / values.length;
}
function normaliseDb(value, lo, hi) {
    return clamp01((value - lo) / (hi - lo));
}
function computeGenreBias(artists) {
    const scores = {
        glitch: 0,
        neon: 0,
        organic: 0,
        metallic: 0,
        softness: 0,
        aggression: 0,
        density: 0,
        groove: 0,
        darkness: 0,
    };
    const genres = artists.flatMap((artist) => artist.genres ?? []);
    for (const genre of genres) {
        const g = genre.toLowerCase();
        if (/(hyperpop|glitch|digicore|electroclash|edm|electropop|dance)/.test(g)) {
            scores.glitch += 0.18;
            scores.neon += 0.16;
            scores.density += 0.08;
        }
        if (/(industrial|metal|hardcore|punk|noise|phonk)/.test(g)) {
            scores.aggression += 0.18;
            scores.darkness += 0.12;
            scores.metallic += 0.16;
        }
        if (/(indie|folk|acoustic|ambient|dream|shoegaze|singer-songwriter)/.test(g)) {
            scores.organic += 0.18;
            scores.softness += 0.14;
            scores.glitch -= 0.05;
        }
        if (/(house|garage|disco|funk|dance|groove|afrobeats|club)/.test(g)) {
            scores.groove += 0.16;
            scores.neon += 0.08;
        }
        if (/(r&b|soul|jazz|lounge|trip hop|downtempo)/.test(g)) {
            scores.softness += 0.12;
            scores.organic += 0.08;
            scores.darkness += 0.06;
        }
    }
    for (const key of Object.keys(scores)) {
        scores[key] = clamp01(scores[key]);
    }
    return scores;
}
function computeDominantPitch(analysis) {
    if (!analysis || analysis.segments.length === 0) {
        return { dominantPitchClass: 9, hue: 300 };
    }
    const pitchTotals = new Array(12).fill(0);
    for (const segment of analysis.segments) {
        const weight = Math.max(segment.duration, 0.05);
        for (let i = 0; i < 12; i++) {
            pitchTotals[i] += (segment.pitches[i] ?? 0) * weight;
        }
    }
    let bestIndex = 0;
    let bestValue = -Infinity;
    for (let i = 0; i < pitchTotals.length; i++) {
        if (pitchTotals[i] > bestValue) {
            bestValue = pitchTotals[i];
            bestIndex = i;
        }
    }
    return {
        dominantPitchClass: bestIndex,
        hue: (bestIndex / 12) * 360,
    };
}
function computeAnalysisTraits(analysis) {
    if (!analysis || analysis.segments.length === 0) {
        return {
            glitch: 0,
            metallic: 0,
            density: 0,
            aggression: 0,
            softness: 0.5,
        };
    }
    const segments = analysis.segments;
    const timbre0 = average(segments.map((segment) => segment.timbre[0] ?? 0));
    const timbre2 = average(segments.map((segment) => segment.timbre[2] ?? 0));
    const timbre5 = average(segments.map((segment) => segment.timbre[5] ?? 0));
    const timbre6 = average(segments.map((segment) => segment.timbre[6] ?? 0));
    const timbre7 = average(segments.map((segment) => segment.timbre[7] ?? 0));
    const loudnessMax = average(segments.map((segment) => segment.loudness_max));
    const loudnessSpread = average(segments.map((segment) => segment.loudness_max - segment.loudness_start));
    const sectionDensity = analysis.sections.length > 0 ? analysis.segments.length / analysis.sections.length : 0;
    const tatumRate = analysis.track.duration > 0 ? analysis.tatums.length / analysis.track.duration : 0;
    return {
        glitch: clamp01(normaliseDb(loudnessSpread, 2, 16) * 0.55 +
            normaliseDb(timbre7, -80, 80) * 0.25 +
            clamp01(tatumRate / 6) * 0.2),
        metallic: clamp01(normaliseDb(timbre5, -80, 80) * 0.45 +
            normaliseDb(timbre6, -80, 80) * 0.35 +
            normaliseDb(timbre2, -80, 80) * 0.2),
        density: clamp01(clamp01(sectionDensity / 30) * 0.5 + clamp01(tatumRate / 6) * 0.5),
        aggression: clamp01(normaliseDb(loudnessMax, -30, 0) * 0.6 +
            normaliseDb(timbre0, 0, 60) * 0.4),
        softness: clamp01(0.6 * (1 - normaliseDb(timbre7, -80, 80)) +
            0.4 * (1 - normaliseDb(loudnessSpread, 2, 16))),
    };
}
function pickLabel(profile) {
    const parts = [];
    if (profile.glitch > 0.62)
        parts.push("glitch-charged");
    else if (profile.organic > 0.62)
        parts.push("organic");
    else if (profile.groove > 0.58)
        parts.push("groove-led");
    else
        parts.push("shape-shifting");
    if (profile.neon > 0.6)
        parts.push("neon");
    else if (profile.darkness > 0.62)
        parts.push("nocturne");
    else if (profile.softness > 0.62)
        parts.push("dreamy");
    else if (profile.metallic > 0.58)
        parts.push("chrome");
    return parts.slice(0, 2).join(" ");
}
function inferStyleProfile(args) {
    const { artists, features, analysis } = args;
    const bias = computeGenreBias(artists);
    const derived = computeAnalysisTraits(analysis);
    const dominantPitch = computeDominantPitch(analysis);
    const energy = features?.energy ?? 0.5;
    const danceability = features?.danceability ?? 0.5;
    const acousticness = features?.acousticness ?? 0.2;
    const instrumentalness = features?.instrumentalness ?? 0.1;
    const valence = features?.valence ?? 0.5;
    const loudness = features?.loudness ?? -12;
    const profileBase = {
        glitch: clamp01(derived.glitch * 0.55 + energy * 0.15 + bias.glitch * 0.3),
        neon: clamp01(valence * 0.35 + energy * 0.2 + bias.neon * 0.25 + (1 - acousticness) * 0.2),
        organic: clamp01(acousticness * 0.45 + instrumentalness * 0.15 + derived.softness * 0.15 + bias.organic * 0.25),
        metallic: clamp01(derived.metallic * 0.7 + bias.metallic * 0.3),
        softness: clamp01((1 - energy) * 0.2 + derived.softness * 0.45 + bias.softness * 0.2 + acousticness * 0.15),
        aggression: clamp01(energy * 0.35 + normaliseDb(loudness, -24, -4) * 0.25 + derived.aggression * 0.25 + bias.aggression * 0.15),
        density: clamp01(derived.density * 0.45 + danceability * 0.2 + energy * 0.15 + bias.density * 0.2),
        groove: clamp01(danceability * 0.55 + (features?.tempo ? clamp01(features.tempo / 160) : 0.4) * 0.15 + bias.groove * 0.3),
        darkness: clamp01((1 - valence) * 0.45 + normaliseDb(-loudness, 4, 24) * 0.15 + bias.darkness * 0.2 + derived.metallic * 0.2),
        dominantPitchClass: dominantPitch.dominantPitchClass,
        dominantPitchLabel: PITCH_LABELS[dominantPitch.dominantPitchClass] ?? "C",
        hue: dominantPitch.hue,
        saturation: clamp01(0.35 + valence * 0.2 + bias.neon * 0.25 + derived.glitch * 0.2),
        brightness: clamp01(0.35 + energy * 0.25 + valence * 0.15 + (1 - acousticness) * 0.1),
    };
    const profile = {
        ...profileBase,
        label: "",
        confidence: clamp01(0.3 +
            Math.max(...Object.values({
                glitch: profileBase.glitch,
                organic: profileBase.organic,
                groove: profileBase.groove,
                darkness: profileBase.darkness,
                neon: profileBase.neon,
            })) *
                0.5 +
            Math.min(artists.flatMap((artist) => artist.genres).length, 4) * 0.05),
        genreHints: artists.flatMap((artist) => artist.genres).slice(0, 6),
    };
    profile.label = pickLabel(profileBase);
    return profile;
}
function smoothStyleProfile(current, next, amount = 0.15) {
    const blend = (a, b) => a + (b - a) * amount;
    return {
        ...next,
        confidence: blend(current.confidence, next.confidence),
        glitch: blend(current.glitch, next.glitch),
        neon: blend(current.neon, next.neon),
        organic: blend(current.organic, next.organic),
        metallic: blend(current.metallic, next.metallic),
        softness: blend(current.softness, next.softness),
        aggression: blend(current.aggression, next.aggression),
        density: blend(current.density, next.density),
        groove: blend(current.groove, next.groove),
        darkness: blend(current.darkness, next.darkness),
        hue: blend(current.hue, next.hue),
        saturation: blend(current.saturation, next.saturation),
        brightness: blend(current.brightness, next.brightness),
    };
}
function spanProgress(start, duration, progressMs) {
    if (duration <= 0)
        return 0;
    return clamp01((progressMs / 1000 - start) / duration);
}
function buildAnalysisFrame(args) {
    const { analysis, progressMs, currentBeatIndex, currentSectionIndex, currentSegmentIndex, currentTatumIndex } = args;
    if (!analysis) {
        return {
            segment: null,
            tatumProgress: 0,
            beatProgress: 0,
            sectionProgress: 0,
            sectionTransition: 0,
        };
    }
    const segment = analysis.segments[currentSegmentIndex] ?? null;
    const tatum = analysis.tatums[currentTatumIndex] ?? null;
    const beat = analysis.beats[currentBeatIndex] ?? null;
    const section = analysis.sections[currentSectionIndex] ?? null;
    const sectionProgress = section
        ? spanProgress(section.start, section.duration, progressMs)
        : 0;
    return {
        segment,
        tatumProgress: tatum ? spanProgress(tatum.start, tatum.duration, progressMs) : 0,
        beatProgress: beat ? spanProgress(beat.start, beat.duration, progressMs) : 0,
        sectionProgress,
        sectionTransition: sectionProgress < 0.14 ? 1 - sectionProgress / 0.14 :
            sectionProgress > 0.86 ? (sectionProgress - 0.86) / 0.14 :
                0,
    };
}
//# sourceMappingURL=styleProfile.js.map
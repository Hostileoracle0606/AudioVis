"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectStoryContext = collectStoryContext;
exports.buildStoryContext = buildStoryContext;
const client_js_1 = require("../spotify/client.js");
const styleProfile_js_1 = require("../spotify/styleProfile.js");
const lyrics_js_1 = require("./lyrics.js");
function normalizeText(value) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}
function matchesDesktopPlayback(player, track) {
    const desktopTrack = normalizeText(player.trackName);
    const desktopArtist = normalizeText(player.artistName);
    const spotifyTrack = normalizeText(track.name);
    const spotifyArtists = track.artists.map((artist) => normalizeText(artist.name));
    if (desktopTrack && spotifyTrack && desktopTrack !== spotifyTrack) {
        return false;
    }
    if (!desktopArtist)
        return true;
    return spotifyArtists.some((artist) => artist === desktopArtist || artist.includes(desktopArtist));
}
function resolveTrack(playback) {
    if (!playback || playback.currently_playing_type !== "track")
        return null;
    return playback.item ?? null;
}
async function collectStoryContext(args = {}) {
    const warnings = [];
    const playback = args.playback ?? (await (0, client_js_1.getCurrentPlayback)());
    const track = resolveTrack(playback);
    if (!track?.id) {
        return {
            context: null,
            warnings: ["Spotify track ID unavailable for story generation."],
        };
    }
    if (args.player && !matchesDesktopPlayback(args.player, track)) {
        return {
            context: null,
            warnings: ["Waiting for Spotify Web API playback to match the desktop track."],
        };
    }
    const includeLyrics = args.includeLyrics !== false;
    const [audioFeatures, audioAnalysis, artists, lyrics] = await Promise.all([
        (0, client_js_1.getAudioFeatures)(track.id),
        (0, client_js_1.getAudioAnalysis)(track.id),
        (0, client_js_1.getArtists)(track.artists.map((artist) => artist.id)),
        includeLyrics ? (0, lyrics_js_1.fetchLyrics)(track.id) : Promise.resolve(null),
    ]);
    const styleProfile = (0, styleProfile_js_1.inferStyleProfile)({
        artists,
        features: audioFeatures,
        analysis: audioAnalysis,
    });
    const lyricLines = lyrics ?? [];
    const lyricSummary = (0, lyrics_js_1.summarizeLyrics)(lyricLines);
    const context = {
        trackId: track.id,
        title: track.name,
        artist: track.artists.map((artist) => artist.name).join(", "),
        album: track.album.name,
        durationMs: track.duration_ms,
        progressMs: playback?.progress_ms ?? 0,
        isPlaying: playback?.is_playing ?? false,
        playback: playback ?? {
            is_playing: false,
            progress_ms: 0,
            item: track,
            device: null,
            currently_playing_type: "track",
        },
        lyricsAvailable: lyricLines.length > 0,
        lyrics: lyricLines,
        lyricSummary,
        lyricSummaryText: (0, lyrics_js_1.formatLyricSummary)(lyricSummary),
        artists,
        genreHints: artists.flatMap((artist) => artist.genres).slice(0, 8),
        audioFeatures,
        audioAnalysis,
        styleProfile,
    };
    if (lyricLines.length === 0) {
        warnings.push("Lyrics unavailable; using metadata-only story context.");
    }
    return { context, warnings };
}
async function buildStoryContext(player) {
    return collectStoryContext({ player });
}
//# sourceMappingURL=context.js.map
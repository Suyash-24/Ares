const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const MAX_SPOTIFY_TRACKS = 100;

const spotifyTokenCache = {
	token: null,
	expiresAt: 0,
	cacheKey: null
};

function createSpotifyError(code, message, cause = null) {
	const error = new Error(message);
	error.code = code;
	if (cause) {
		error.cause = cause;
	}
	return error;
}

function isSpotifyHost(hostname) {
	const normalized = String(hostname || '').toLowerCase();
	return normalized === 'open.spotify.com' || normalized.endsWith('.spotify.com');
}

function normalizeSpotifyPath(pathname) {
	const parts = pathname.split('/').filter(Boolean);
	if (parts.length >= 3 && /^intl-[a-z]{2}$/i.test(parts[0])) {
		return parts.slice(1);
	}
	return parts;
}

function parseSpotifyQuery(input) {
	if (!input || typeof input !== 'string') {
		return null;
	}

	const trimmed = input.trim();
	if (!trimmed) {
		return null;
	}

	if (trimmed.startsWith('spotify:')) {
		const uriParts = trimmed.split(':').filter(Boolean);
		if (uriParts.length >= 3) {
			const type = uriParts[1]?.toLowerCase();
			const id = uriParts[2]?.trim();
			if (id && ['track', 'playlist', 'album'].includes(type)) {
				return { type, id };
			}
		}
		return null;
	}

	let parsed;
	try {
		parsed = new URL(trimmed);
	} catch {
		return null;
	}

	if (!isSpotifyHost(parsed.hostname)) {
		return null;
	}

	const segments = normalizeSpotifyPath(parsed.pathname);
	if (segments.length < 2) {
		return null;
	}

	const type = String(segments[0] || '').toLowerCase();
	const rawId = String(segments[1] || '');
	const id = rawId.split('?')[0].trim();

	if (!id || !['track', 'playlist', 'album'].includes(type)) {
		return null;
	}

	return { type, id };
}

function resolveSpotifyCredentials(config) {
	const envClientId = process.env.SPOTIFY_CLIENT_ID?.trim();
	const envClientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim();

	const configClientId = config?.spotify?.clientId?.trim();
	const configClientSecret = config?.spotify?.clientSecret?.trim();

	const clientId = envClientId || configClientId;
	const clientSecret = envClientSecret || configClientSecret;

	if (!clientId || !clientSecret) {
		return null;
	}

	return { clientId, clientSecret };
}

async function getSpotifyAccessToken(credentials) {
	const now = Date.now();
	const cacheKey = `${credentials.clientId}:${credentials.clientSecret}`;

	if (
		spotifyTokenCache.token &&
		spotifyTokenCache.cacheKey === cacheKey &&
		now < spotifyTokenCache.expiresAt - 10_000
	) {
		return spotifyTokenCache.token;
	}

	let response;
	try {
		response = await fetch(SPOTIFY_TOKEN_URL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Authorization: `Basic ${Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString('base64')}`
			},
			body: 'grant_type=client_credentials'
		});
	} catch (error) {
		throw createSpotifyError('SPOTIFY_TOKEN_REQUEST_FAILED', 'Failed to contact Spotify token endpoint.', error);
	}

	if (!response.ok) {
		throw createSpotifyError('SPOTIFY_TOKEN_REQUEST_FAILED', `Spotify token request failed with HTTP ${response.status}.`);
	}

	const data = await response.json();
	if (!data?.access_token) {
		throw createSpotifyError('SPOTIFY_TOKEN_REQUEST_FAILED', 'Spotify token response did not include an access token.');
	}

	spotifyTokenCache.token = data.access_token;
	spotifyTokenCache.cacheKey = cacheKey;
	spotifyTokenCache.expiresAt = now + Math.max((data.expires_in || 3600) * 1000, 60_000);

	return spotifyTokenCache.token;
}

async function spotifyRequest(pathname, accessToken) {
	let response;
	try {
		response = await fetch(`${SPOTIFY_API_BASE}${pathname}`, {
			headers: {
				Authorization: `Bearer ${accessToken}`
			}
		});
	} catch (error) {
		throw createSpotifyError('SPOTIFY_API_REQUEST_FAILED', 'Failed to contact Spotify API.', error);
	}

	if (!response.ok) {
		throw createSpotifyError('SPOTIFY_API_REQUEST_FAILED', `Spotify API request failed with HTTP ${response.status}.`);
	}

	return response.json();
}

function normalizeSpotifyTrack(trackWrapper) {
	const track = trackWrapper?.track ?? trackWrapper;
	if (!track || track.is_local || !track.name) {
		return null;
	}

	const artists = Array.isArray(track.artists)
		? track.artists.map((artist) => artist?.name).filter(Boolean)
		: [];

	if (!artists.length) {
		return null;
	}

	return {
		id: track.id ?? null,
		name: track.name,
		artists
	};
}

async function fetchSpotifyTrack(resourceId, accessToken) {
	const track = await spotifyRequest(`/tracks/${resourceId}`, accessToken);
	const normalized = normalizeSpotifyTrack(track);
	return normalized ? [normalized] : [];
}

async function fetchSpotifyPlaylist(resourceId, accessToken) {
	const playlist = await spotifyRequest(`/playlists/${resourceId}?fields=name`, accessToken);
	const tracks = [];
	let offset = 0;

	while (tracks.length < MAX_SPOTIFY_TRACKS) {
		const page = await spotifyRequest(`/playlists/${resourceId}/tracks?limit=100&offset=${offset}`, accessToken);
		const items = Array.isArray(page?.items) ? page.items : [];
		if (!items.length) {
			break;
		}

		for (const item of items) {
			const normalized = normalizeSpotifyTrack(item);
			if (normalized) {
				tracks.push(normalized);
				if (tracks.length >= MAX_SPOTIFY_TRACKS) {
					break;
				}
			}
		}

		if (!page?.next || items.length < 100) {
			break;
		}
		offset += items.length;
	}

	return {
		name: playlist?.name || 'Spotify Playlist',
		tracks
	};
}

async function fetchSpotifyAlbum(resourceId, accessToken) {
	const album = await spotifyRequest(`/albums/${resourceId}`, accessToken);
	const tracks = [];
	let offset = 0;

	while (tracks.length < MAX_SPOTIFY_TRACKS) {
		const page = await spotifyRequest(`/albums/${resourceId}/tracks?limit=50&offset=${offset}`, accessToken);
		const items = Array.isArray(page?.items) ? page.items : [];
		if (!items.length) {
			break;
		}

		for (const item of items) {
			const normalized = normalizeSpotifyTrack(item);
			if (normalized) {
				tracks.push(normalized);
				if (tracks.length >= MAX_SPOTIFY_TRACKS) {
					break;
				}
			}
		}

		if (!page?.next || items.length < 50) {
			break;
		}
		offset += items.length;
	}

	return {
		name: album?.name || 'Spotify Album',
		tracks
	};
}

async function resolveYouTubeTrack(node, trackTitle, artists) {
	const artistString = artists.join(' ');
	const searchVariants = [
		`${trackTitle} ${artistString}`.trim(),
		trackTitle.trim()
	].filter(Boolean);

	for (const searchText of searchVariants) {
		const result = await node.rest.resolve(`ytsearch:${searchText}`);
		if (!result?.data) {
			continue;
		}

		if (result.loadType === 'track') {
			return result.data;
		}

		if (Array.isArray(result.data) && result.data.length > 0) {
			return result.data[0];
		}
	}

	return null;
}

async function mapSpotifyTracksToPlayable(node, spotifyTracks) {
	const playable = [];
	for (const track of spotifyTracks) {
		try {
			const resolved = await resolveYouTubeTrack(node, track.name, track.artists);
			if (resolved?.info) {
				playable.push(resolved);
			}
		} catch {
			continue;
		}
	}
	return playable;
}

export function isSpotifyQuery(input) {
	return Boolean(parseSpotifyQuery(input));
}

export async function resolveSpotifyQuery(input, node, config) {
	const parsed = parseSpotifyQuery(input);
	if (!parsed) {
		return null;
	}

	if (!node?.rest || typeof node.rest.resolve !== 'function') {
		throw createSpotifyError('SPOTIFY_NODE_UNAVAILABLE', 'No Lavalink node available to resolve Spotify tracks.');
	}

	const credentials = resolveSpotifyCredentials(config);
	if (!credentials) {
		throw createSpotifyError(
			'SPOTIFY_CREDENTIALS_MISSING',
			'Spotify credentials are missing. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in environment variables or config.json.'
		);
	}

	const accessToken = await getSpotifyAccessToken(credentials);

	if (parsed.type === 'track') {
		const spotifyTracks = await fetchSpotifyTrack(parsed.id, accessToken);
		const playableTracks = await mapSpotifyTracksToPlayable(node, spotifyTracks);
		return playableTracks[0]
			? { loadType: 'track', data: playableTracks[0] }
			: { loadType: 'empty', data: [] };
	}

	if (parsed.type === 'playlist') {
		const playlist = await fetchSpotifyPlaylist(parsed.id, accessToken);
		const playableTracks = await mapSpotifyTracksToPlayable(node, playlist.tracks);
		return playableTracks.length
			? {
				loadType: 'playlist',
				data: playableTracks,
				playlist: { name: playlist.name }
			}
			: { loadType: 'empty', data: [], playlist: { name: playlist.name } };
	}

	if (parsed.type === 'album') {
		const album = await fetchSpotifyAlbum(parsed.id, accessToken);
		const playableTracks = await mapSpotifyTracksToPlayable(node, album.tracks);
		return playableTracks.length
			? {
				loadType: 'playlist',
				data: playableTracks,
				playlist: { name: album.name }
			}
			: { loadType: 'empty', data: [], playlist: { name: album.name } };
	}

	return { loadType: 'empty', data: [] };
}

export function isEmptyLoadResult(result) {
	if (!result) {
		return true;
	}

	if (result.loadType === 'empty' || result.loadType === 'error') {
		return true;
	}

	if (Array.isArray(result.data)) {
		return result.data.length === 0;
	}

	return !result.data;
}

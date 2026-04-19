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

function createSpotifyHttpError(message, status, details = null, cause = null) {
	const error = createSpotifyError('SPOTIFY_API_REQUEST_FAILED', message, cause);
	error.status = status;
	error.details = details;
	return error;
}

function normalizeInput(input) {
	if (typeof input !== 'string') {
		return '';
	}

	const trimmed = input.trim();
	const wrapped = trimmed.match(/^<(.+)>$/);
	return wrapped ? wrapped[1].trim() : trimmed;
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

	const trimmed = normalizeInput(input);
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
		let details = null;
		try {
			details = await response.text();
		} catch {}

		throw createSpotifyHttpError(`Spotify API request failed with HTTP ${response.status}.`, response.status, details);
	}

	return response.json();
}

async function fetchSpotifyPageHtml(pathname) {
	const url = `https://open.spotify.com${pathname}`;

	let response;
	try {
		response = await fetch(url, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (Ares Discord Bot)'
			}
		});
	} catch (error) {
		throw createSpotifyError('SPOTIFY_HTML_FETCH_FAILED', 'Failed to load Spotify page HTML.', error);
	}

	if (!response.ok) {
		throw createSpotifyError('SPOTIFY_HTML_FETCH_FAILED', `Spotify page request failed with HTTP ${response.status}.`);
	}

	return response.text();
}

function decodeHtmlEntities(text) {
	if (!text || typeof text !== 'string') {
		return '';
	}

	return text
		.replace(/&amp;/g, '&')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&#x27;/g, "'");
}

function extractPlaylistNameFromHtml(html) {
	const titleMatch = html.match(/<title>(.*?) - playlist by .*?\| Spotify<\/title>/i);
	if (titleMatch?.[1]) {
		return decodeHtmlEntities(titleMatch[1].trim());
	}

	const ogTitleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i);
	if (ogTitleMatch?.[1]) {
		return decodeHtmlEntities(ogTitleMatch[1].trim());
	}

	return 'Spotify Playlist';
}

function extractTrackIdsFromHtml(html) {
	const ids = [];
	const seen = new Set();

	for (const match of html.matchAll(/<meta name="music:song" content="https:\/\/open\.spotify\.com\/track\/([a-zA-Z0-9]+)"/g)) {
		const id = match[1]?.trim();
		if (!id || seen.has(id)) {
			continue;
		}

		seen.add(id);
		ids.push(id);

		if (ids.length >= MAX_SPOTIFY_TRACKS) {
			break;
		}
	}

	return ids;
}

function extractTrackTitlesFromHtml(html) {
	const titles = [];

	for (const match of html.matchAll(/aria-label="([^"]+)"[^>]*data-testid="track-row"/g)) {
		const title = decodeHtmlEntities(match[1]?.trim());
		if (!title) {
			continue;
		}

		titles.push(title);
		if (titles.length >= MAX_SPOTIFY_TRACKS) {
			break;
		}
	}

	return titles;
}

async function fetchSpotifyTracksByIds(trackIds, accessToken) {
	if (!accessToken || !Array.isArray(trackIds) || trackIds.length === 0) {
		return [];
	}

	const tracks = [];

	for (let index = 0; index < trackIds.length; index += 50) {
		const chunk = trackIds.slice(index, index + 50);
		const data = await spotifyRequest(`/tracks?ids=${chunk.join(',')}`, accessToken);
		const items = Array.isArray(data?.tracks) ? data.tracks : [];

		for (const item of items) {
			const normalized = normalizeSpotifyTrack(item);
			if (normalized) {
				tracks.push(normalized);
			}
		}
	}

	return tracks;
}

async function fetchSpotifyPlaylistFromHtml(resourceId, accessToken) {
	const html = await fetchSpotifyPageHtml(`/playlist/${resourceId}`);
	const playlistName = extractPlaylistNameFromHtml(html);
	const trackIds = extractTrackIdsFromHtml(html);
	const trackTitles = extractTrackTitlesFromHtml(html);

	if (!trackIds.length && !trackTitles.length) {
		throw createSpotifyError('SPOTIFY_EMPTY_SOURCE', 'Spotify playlist page did not include any track metadata.');
	}

	try {
		if (trackIds.length) {
			const detailedTracks = await fetchSpotifyTracksByIds(trackIds, accessToken);
			if (detailedTracks.length) {
				return {
					name: playlistName,
					tracks: detailedTracks.slice(0, MAX_SPOTIFY_TRACKS)
				};
			}
		}
	} catch {
		// Ignore API enrichment errors and fallback to title-based matching.
	}

	const fallbackTracks = [];
	const total = Math.max(trackIds.length, trackTitles.length);

	for (let index = 0; index < total && fallbackTracks.length < MAX_SPOTIFY_TRACKS; index++) {
		const title = trackTitles[index] || `Track ${index + 1}`;
		const id = trackIds[index] || null;
		fallbackTracks.push({
			id,
			name: title,
			artists: []
		});
	}

	return {
		name: playlistName,
		tracks: fallbackTracks
	};
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
	if (!accessToken) {
		return fetchSpotifyPlaylistFromHtml(resourceId, null);
	}

	try {
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
	} catch (error) {
		if (error?.code === 'SPOTIFY_API_REQUEST_FAILED' && (error?.status === 401 || error?.status === 403 || error?.status === 404)) {
			return fetchSpotifyPlaylistFromHtml(resourceId, accessToken);
		}

		throw error;
	}
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
	const artistString = Array.isArray(artists) ? artists.join(' ') : '';
	const searchVariants = [
		`${trackTitle} ${artistString}`.trim(),
		trackTitle.trim()
	].filter(Boolean);
	const sourcePrefixes = ['ytsearch', 'ytmsearch', 'scsearch'];

	for (const searchText of searchVariants) {
		for (const prefix of sourcePrefixes) {
			const result = await node.rest.resolve(`${prefix}:${searchText}`);
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

	let accessToken = null;
	const credentials = resolveSpotifyCredentials(config);

	if (credentials) {
		try {
			accessToken = await getSpotifyAccessToken(credentials);
		} catch (error) {
			if (parsed.type !== 'playlist') {
				throw error;
			}
		}
	} else if (parsed.type !== 'playlist') {
		throw createSpotifyError(
			'SPOTIFY_CREDENTIALS_MISSING',
			'Spotify credentials are missing. Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in environment variables or config.json.'
		);
	}

	if (parsed.type === 'track') {
		const spotifyTracks = await fetchSpotifyTrack(parsed.id, accessToken);
		if (!spotifyTracks.length) {
			throw createSpotifyError('SPOTIFY_EMPTY_SOURCE', 'Spotify did not return any playable tracks for this link.');
		}

		const playableTracks = await mapSpotifyTracksToPlayable(node, spotifyTracks);
		if (!playableTracks.length) {
			throw createSpotifyError('SPOTIFY_RESOLVE_FAILED', 'Spotify track was found, but no playable source could be resolved.');
		}

		return { loadType: 'track', data: playableTracks[0] };
	}

	if (parsed.type === 'playlist') {
		const playlist = await fetchSpotifyPlaylist(parsed.id, accessToken);
		if (!playlist.tracks.length) {
			throw createSpotifyError('SPOTIFY_EMPTY_SOURCE', 'Spotify playlist has no playable tracks or is not accessible.');
		}

		const playableTracks = await mapSpotifyTracksToPlayable(node, playlist.tracks);
		if (!playableTracks.length) {
			throw createSpotifyError('SPOTIFY_RESOLVE_FAILED', 'Spotify playlist was found, but no playable sources could be resolved.');
		}

		return {
			loadType: 'playlist',
			data: playableTracks,
			playlist: { name: playlist.name }
		};
	}

	if (parsed.type === 'album') {
		const album = await fetchSpotifyAlbum(parsed.id, accessToken);
		if (!album.tracks.length) {
			throw createSpotifyError('SPOTIFY_EMPTY_SOURCE', 'Spotify album has no playable tracks or is not accessible.');
		}

		const playableTracks = await mapSpotifyTracksToPlayable(node, album.tracks);
		if (!playableTracks.length) {
			throw createSpotifyError('SPOTIFY_RESOLVE_FAILED', 'Spotify album was found, but no playable sources could be resolved.');
		}

		return {
			loadType: 'playlist',
			data: playableTracks,
			playlist: { name: album.name }
		};
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

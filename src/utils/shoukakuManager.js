import { Shoukaku, Connectors } from 'shoukaku';
import { ContainerBuilder, MessageFlags, SeparatorSpacingSize, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import EMOJIS from '../utils/emojis.js';

const recommendationCache = new Map();
const expiredRecommendations = new Set();
const BACKEND_UNAVAILABLE_PATTERN = /ECONNREFUSED|EHOSTUNREACH|ENOTFOUND|No nodes are available|No available nodes|No Lavalink node is currently connected|WebSocket is not open|connection refused/i;
const LOCALHOST_FALLBACK_NODES = [
	{
		name: 'Localhost',
		host: '127.0.0.1',
		port: 2333,
		password: 'youshallnotpass',
		secure: false
	}
];
const PRIME_MUSIC_PUBLIC_NODES = [
	{
		name: 'Prime-DE',
		host: 'de-01.strixnodes.com',
		port: 2010,
		password: 'glace',
		secure: false
	},
	{
		name: 'Prime-US',
		host: 'us-01.strixnodes.com',
		port: 8003,
		password: 'glace',
		secure: false
	}
];
const ARES_LEGACY_FALLBACK_NODES = [
	{
		name: 'Legacy-1',
		url: 'lava-v4.ajieblogs.eu.org:443',
		auth: 'https://dsc.gg/ajidevserver',
		secure: true
	},
	{
		name: 'Legacy-2',
		url: 'lavalinkv4.serenetia.com:443',
		auth: 'https://dsc.gg/ajidevserver',
		secure: true
	}
];

function isBackendUnavailableError(error) {
	const message = error?.message ?? '';
	if (error?.code === 'LAVALINK_UNAVAILABLE') {
		return true;
	}

	return BACKEND_UNAVAILABLE_PATTERN.test(message);
}

export function initializeShoukaku(client, config) {

	const allNodes = resolveNodes(config);
	const startupNodes = allNodes;

	const shoukaku = new Shoukaku(
		new Connectors.DiscordJS(client),
		startupNodes,
		{
			resume: true,
			resumeTimeout: 30,
			reconnectTries: 5,
			reconnectInterval: 5,
			restTimeout: 60,
			moveOnDisconnect: true,
			userAgent: 'Ares/1.0.0 (Discord Bot)',
			voiceConnectionTimeout: 15
		}
	);

	// Store all resolved nodes for failover
	shoukaku._aresNodes = allNodes;
	shoukaku._aresNodeIndex = 0;
	shoukaku._aresFailoverAttempts = 0;
	shoukaku._aresMaxFailoverCycles = allNodes.length; // 1 cycle = exhaust retries on one node

	registerNodeEvents(shoukaku, client, config);

	console.log(`🎵 [Lavalink] Starting with ${allNodes.length} node(s): ${allNodes.map((node) => node.name).join(', ')}`);

	return shoukaku;
}

function resolveNodes(config) {
	const envNodes = resolveNodesFromEnvironment();
	const configured = Array.isArray(config?.lavalink?.nodes) ? config.lavalink.nodes : [];
	const normalizedConfig = normalizeNodes(configured);
	const allExplicitNodes = dedupeNodes([
		...envNodes,
		...normalizedConfig
	]);
	const allowLocalhostNodes = shouldAllowLocalhostNodes();
	const explicitNodes = allowLocalhostNodes
		? allExplicitNodes
		: allExplicitNodes.filter((node) => !isLocalNode(node));
	const allowPublicFallback = shouldUsePublicFallback();

	if (!allowLocalhostNodes && allExplicitNodes.length !== explicitNodes.length) {
		console.warn('Ignoring localhost Lavalink node(s). Set LAVALINK_ALLOW_LOCALHOST=true to enable local nodes.');
	}

	if (explicitNodes.length && !allowPublicFallback) {
		return explicitNodes;
	}

	const localhostFallback = allowLocalhostNodes ? normalizeNodes(LOCALHOST_FALLBACK_NODES) : [];
	const primeFallback = allowPublicFallback ? normalizeNodes(PRIME_MUSIC_PUBLIC_NODES) : [];
	const legacyFallback = allowPublicFallback ? normalizeNodes(ARES_LEGACY_FALLBACK_NODES) : [];

	const combined = dedupeNodes([
		...explicitNodes,
		...localhostFallback,
		...primeFallback,
		...legacyFallback
	]);

	if (combined.length) {
		return combined;
	}

	throw new Error('No valid Lavalink nodes found. Please configure at least one node in config.json or the LAVALINK_NODES environment variable.');
}

function shouldUsePublicFallback() {
	const value = String(process.env.LAVALINK_PUBLIC_FALLBACK ?? 'true').toLowerCase();
	return !['0', 'false', 'no', 'off'].includes(value);
}

function shouldAllowLocalhostNodes() {
	const value = String(process.env.LAVALINK_ALLOW_LOCALHOST ?? 'false').toLowerCase();
	return !['0', 'false', 'no', 'off'].includes(value);
}

function isLocalNode(node) {
	if (!node?.url || typeof node.url !== 'string') {
		return false;
	}

	let host = node.url;
	if (host.includes('://')) {
		try {
			host = new URL(host).hostname;
		} catch {
			return false;
		}
	} else {
		host = host.split(':')[0];
	}

	const normalizedHost = host.toLowerCase();
	return normalizedHost === '127.0.0.1' || normalizedHost === 'localhost' || normalizedHost === '::1';
}

function resolveNodesFromEnvironment() {
	if (!process.env.LAVALINK_NODES) {
		return [];
	}

	try {
		const parsed = JSON.parse(process.env.LAVALINK_NODES);
		return normalizeNodes(Array.isArray(parsed) ? parsed : [parsed]);
	} catch (error) {
		console.warn('Failed to parse LAVALINK_NODES environment variable:', error);
		return [];
	}
}

function dedupeNodes(nodes) {
	const seen = new Set();
	const result = [];

	for (const node of nodes) {
		if (!node) {
			continue;
		}

		const key = `${node.url}|${node.auth}|${node.secure ? '1' : '0'}`;
		if (seen.has(key)) {
			continue;
		}

		seen.add(key);
		result.push(node);
	}

	return result;
}

function normalizeNodes(nodes) {
	return nodes
		.map((node, index) => normalizeNode(node, index))
		.filter(Boolean);
}

function normalizeNode(node, index) {
	if (!node) {
		return null;
	}

	const name = node.name ?? node.identifier ?? `Node-${index + 1}`;
	const auth = node.auth ?? node.password ?? 'youshallnotpass';
	const group = node.group;

	if (node.url && typeof node.url === 'string') {
		const normalized = { name, url: node.url, auth };
		if (typeof node.secure === 'boolean') {
			normalized.secure = node.secure;
		}
		if (group) {
			normalized.group = group;
		}
		return normalized;
	}

	if (node.host) {
		const port = typeof node.port === 'number' ? node.port : Number(node.port) || 2333;
		const normalized = { name, url: `${node.host}:${port}`, auth };
		if (typeof node.secure === 'boolean') {
			normalized.secure = node.secure;
		}
		if (group) {
			normalized.group = group;
		}
		return normalized;
	}

	console.warn(`Skipping Lavalink node at index ${index} due to missing host/url information.`);
	return null;
}

function registerNodeEvents(shoukaku, client, config) {
	shoukaku.on('ready', (name, lavalinkResume, libraryResume) => {
		const resumed = lavalinkResume || libraryResume;
		console.log(`✅ [Lavalink] Connected to ${name}${resumed ? ' (resumed session)' : ''}`);
		// Reset failover counter on successful connection
		shoukaku._aresFailoverAttempts = 0;
	});

	shoukaku.on('reconnecting', (name, reconnectsLeft, reconnectInterval) => {
		console.warn(`🔄 [Lavalink] Reconnecting to ${name}. Attempts left: ${reconnectsLeft} (interval ${reconnectInterval}s)`);
	});

	shoukaku.on('disconnect', (name, players) => {
		console.warn(`⚠️ [Lavalink] Disconnected from ${name}, affected ${players} player(s)`);
		attemptNodeFailover(shoukaku, name, client, config);
	});

	shoukaku.on('close', (name, code, reason) => {
		console.warn(`🔌 [Lavalink] Connection to ${name} closed (code ${code}, reason: ${reason || 'unknown'})`);
	});

	shoukaku.on('error', (name, error) => {
		console.error(`❌ [Lavalink] Error on ${name}:`, error?.message ?? error);
	});

	shoukaku.on('debug', (name, info) => {
		if (typeof info === 'string' && (info.toLowerCase().includes('heartbeat') || info.toLowerCase().includes('server load'))) {
			return;
		}
		console.debug(`🛠️ [Lavalink:${name}] ${info}`);
	});
}

/**
 * Attempts to failover to the next Lavalink node when the current one is exhausted.
 * Each node gets 5 reconnect attempts (handled by Shoukaku's built-in reconnectTries).
 * After those 5 attempts fail, this function switches to the next node.
 * With 2 nodes × 5 retries each = 10 total attempts before giving up.
 */
function attemptNodeFailover(shoukaku, disconnectedName, client, config) {
	const allNodes = shoukaku._aresNodes;
	if (!allNodes || allNodes.length <= 1) {
		console.warn(`⚠️ [Lavalink] No fallback nodes available.`);
		return;
	}

	shoukaku._aresFailoverAttempts++;

	if (shoukaku._aresFailoverAttempts > shoukaku._aresMaxFailoverCycles) {
		console.error(`❌ [Lavalink] All ${shoukaku._aresFailoverAttempts} failover attempts exhausted. No nodes available.`);
		return;
	}

	// Move to the next node in the list
	shoukaku._aresNodeIndex = (shoukaku._aresNodeIndex + 1) % allNodes.length;
	const nextNode = allNodes[shoukaku._aresNodeIndex];

	console.log(`🔄 [Lavalink] Node "${disconnectedName}" failed. Attempting failover to "${nextNode.name}" (failover ${shoukaku._aresFailoverAttempts}/${shoukaku._aresMaxFailoverCycles})...`);

	// Remove the disconnected node if it still exists in Shoukaku's internal map
	try {
		if (shoukaku.nodes.has(disconnectedName)) {
			shoukaku.removeNode(disconnectedName);
		}
	} catch (err) {
		console.debug(`[Lavalink] Could not remove node "${disconnectedName}":`, err?.message);
	}

	// Add the next node (Shoukaku will attempt to connect with its own reconnectTries)
	try {
		if (!shoukaku.nodes.has(nextNode.name)) {
			shoukaku.addNode(nextNode);
			console.log(`✅ [Lavalink] Added fallback node "${nextNode.name}" (${nextNode.url})`);
		} else {
			console.log(`ℹ️ [Lavalink] Node "${nextNode.name}" already in pool, Shoukaku will reconnect automatically.`);
		}
	} catch (err) {
		console.error(`❌ [Lavalink] Failed to add fallback node "${nextNode.name}":`, err?.message);
	}
}

const PLAYER_EVENT_KEY = Symbol('aresPlayerEventHandlers');

export function attachPlayerEvents(player, queue) {
	if (!queue) {
		return;
	}

	detachPlayerEvents(queue);

	if (!player) {
		return;
	}

	const handlers = {
		start: (event) => onTrackStart(player, queue, event),
		end: (event) => onTrackEnd(player, queue, event),
		stuck: (event) => onTrackStuck(player, queue, event),
		exception: (event) => onTrackException(player, queue, event),
		closed: (event) => onWebsocketClosed(player, queue, event)
	};

	for (const [eventName, handler] of Object.entries(handlers)) {
		player.on(eventName, handler);
	}

	queue[PLAYER_EVENT_KEY] = { player, handlers };
}

export function detachPlayerEvents(queue) {
	if (!queue || !queue[PLAYER_EVENT_KEY]) {
		return;
	}

	const { player, handlers } = queue[PLAYER_EVENT_KEY];

	if (player) {
		for (const [eventName, handler] of Object.entries(handlers)) {
			if (typeof player.off === 'function') {
				player.off(eventName, handler);
			}
		}
	}

	delete queue[PLAYER_EVENT_KEY];
}

function onTrackStart(player, queue, event) {
	const track = queue.tracks?.peekAt ? queue.tracks.peekAt(0) : null;
	if (!track) {
		return;
	}

	queue.lastPlayedTrackInfo = track.info;
	if (!Array.isArray(queue.lastRecommendations)) {
		queue.lastRecommendations = [];
	}
	if (!queue.autoplayHistory || typeof queue.autoplayHistory.add !== 'function') {
		queue.autoplayHistory = new Set();
	}

	console.log(`🎵 Now playing: ${track.info.title} [${formatDuration(track.info.length)}]`);

	if (!queue.messageChannel) {
		return;
	}

	if (queue.currentRecommendationId) {
		expiredRecommendations.add(queue.currentRecommendationId);
		recommendationCache.delete(queue.currentRecommendationId);
		queue.currentRecommendationId = null;
	}

	if (queue.currentRecommendationTimeout) {
		clearTimeout(queue.currentRecommendationTimeout);
		queue.currentRecommendationTimeout = null;
	}

	if (queue.nowPlayingMessageId) {
		queue.messageChannel.messages.fetch(queue.nowPlayingMessageId).then((prevMsg) => {
			if (!prevMsg) return;
			const disabled = disableAllComponents(prevMsg.components);
			if (disabled) {
				prevMsg.edit({ components: disabled, flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } }).catch(() => {});
			}
		}).catch(() => {});
	}

	const displayTitle = getDisplayTitle(track.info.title);

	const thumbnailUrl = track.info.artworkUrl ||
		(track.info.uri?.includes('youtube.com') || track.info.uri?.includes('youtu.be')
			? `https://img.youtube.com/vi/${extractYouTubeId(track.info.uri)}/maxresdefault.jpg`
			: null);

	const trackIdentifier = track.info?.identifier || track.encoded || track.info?.uri;
	queue.nowPlayingTrackIdentifier = trackIdentifier;

	fetchYouTubeStats(track.info.uri).then((stats) => {
		const initialContainer = buildNowPlayingContainer({
			track,
			displayTitle,
			thumbnailUrl,
			queue,
			stats: stats,
			loadingRecommendations: false
		});

		queue.messageChannel
			.send({ components: [initialContainer], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } })
			.then((msg) => {
				queue.nowPlayingMessageId = msg.id;
				queue.nowPlayingTrackIdentifier = trackIdentifier;
			})
			.catch((err) => console.error('Failed to send now playing message:', err));
	}).catch((error) => {
		console.error('Failed to fetch stats:', error);

		const initialContainer = buildNowPlayingContainer({
			track,
			displayTitle,
			thumbnailUrl,
			queue,
			stats: null,
			loadingRecommendations: false
		});

		queue.messageChannel
			.send({ components: [initialContainer], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } })
			.then((msg) => {
				queue.nowPlayingMessageId = msg.id;
				queue.nowPlayingTrackIdentifier = trackIdentifier;
			})
			.catch((err) => console.error('Failed to send now playing message:', err));
	});
}

function onTrackEnd(player, queue, event) {
	if (queue.stopped) return;

	const reason = event?.reason ?? 'unknown';
	const currentTrack = queue.tracks?.peekAt ? queue.tracks.peekAt(0) : null;
	const trackTitle = currentTrack?.info?.title ?? 'Unknown track';

	console.log(`⏹️ Track ended on ${queue.guild.name}: reason=${reason}, title=${trackTitle}`);

	if (reason === 'replaced') {
		// Replaced ends are usually caused by an explicit playTrack call and should not mutate queue state.
		return;
	}

	if (reason === 'cleanup') {
		// Cleanup means the player/connection was torn down before a normal end.
		if (queue.messageChannel) {
			queue.messageChannel
				.send('⚠️ Voice connection was cleaned up before track completion. Waiting for reconnect...')
				.catch(() => null);
		}
		return;
	}

	if (reason === 'loadFailed') {
		queue.tracks.removeOne(0);
		if (queue.messageChannel) {
			queue.messageChannel
				.send(`❌ Failed to stream **${trackTitle}**. Skipping...`)
				.catch(() => null);
		}
		playNext(player, queue);
		return;
	}

	if (queue.repeat !== 'OFF') {
		const track = queue.tracks.peekAt(0);
		if (track && queue.repeat === 'ALL') {
			const removed = queue.tracks.removeOne(0);
			if (removed) queue.tracks.push(removed);
		} else if (queue.repeat === 'ONCE') {

		} else {
			queue.tracks.removeOne(0);
		}
	} else {
		queue.tracks.removeOne(0);
	}

	playNext(player, queue);
}

function buildNowPlayingContainer({ track, displayTitle, thumbnailUrl, queue, stats, loadingRecommendations }) {
	const container = new ContainerBuilder();

	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(`# ${EMOJIS.nowplaying} Now Playing`)
	);

	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);

	container.addSectionComponents((section) => {
		const ratingText = stats?.rating ? ` ${EMOJIS.rating} ${stats.rating}` : '';
		const trendingText = stats?.trending ? ` ${EMOJIS.trending} Trending` : '';

		const requesterText = track.requesterName
			? track.requesterName
			: track.userId
				? `<@${track.userId}>`
				: 'Unknown';

		const trackInfo =
			`**${EMOJIS.ytmusic} [${displayTitle}](${track.info.uri || 'https://unknown'})**\n` +
			`**via ➜ ${track.info.author}**\n` +
			`${EMOJIS.duration} ${formatDuration(track.info.length)}${ratingText}${trendingText}\n` +
			`Requested by ${requesterText}`;

		section.addTextDisplayComponents((textDisplay) =>
			textDisplay.setContent(trackInfo)
		);

		if (thumbnailUrl) {
			section.setThumbnailAccessory((thumbnail) =>
				thumbnail.setURL(thumbnailUrl).setDescription('Track artwork')
			);
		}

		return section;
	});

	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);

	container.addActionRowComponents((row) => {
		const previousBtn = new ButtonBuilder()
			.setCustomId('music_previous')
			.setStyle(ButtonStyle.Secondary)
			.setEmoji(EMOJIS.previous);

		const playPauseBtn = new ButtonBuilder()
			.setCustomId('music_playpause')
			.setStyle(queue.paused ? ButtonStyle.Success : ButtonStyle.Danger)
			.setEmoji(queue.paused ? EMOJIS.play : EMOJIS.pause);

		const nextBtn = new ButtonBuilder()
			.setCustomId('music_next')
			.setStyle(ButtonStyle.Secondary)
			.setEmoji(EMOJIS.next);

		row.setComponents(previousBtn, playPauseBtn, nextBtn);
		return row;
	});

	return container;
}

function onTrackStuck(player, queue, event) {
	console.warn(`⚠️ Track stuck on ${queue.guild.name}: ${event.thresholdMs}ms threshold exceeded`);

	if (queue.messageChannel) {
		queue.messageChannel
			.send('⚠️ Track got stuck, skipping...')
			.catch(() => null);
	}

	queue.tracks.removeOne(0);
	playNext(player, queue);
}

async function onTrackException(player, queue, event) {
	const track = queue.tracks.peekAt(0);
	const error = event.exception;

	console.error(`❌ Track error on ${queue.guild.name}:`, error?.message);

	if (error?.message?.includes('requires login') || error?.message?.includes('age restricted')) {
		console.log(`🔄 Attempting to find alternate source for: ${track?.info?.title}`);

		const alternate = await tryAlternateSources(queue, track);
		if (alternate) {
			console.log(`✅ Found alternate version! Now playing.`);
			queue.tracks.removeOne(0);
			queue.tracks.unshift(alternate);
			await player.playTrack({ track: { encoded: alternate.encoded } });
			return;
		}
	}

	queue.tracks.removeOne(0);

	if (queue.messageChannel) {
		queue.messageChannel
			.send(`❌ Could not play: ${track?.info?.title || 'Unknown track'}\n${error?.message || 'Unknown error'}`)
			.catch(() => null);
	}

	playNext(player, queue);
}

async function onWebsocketClosed(player, queue, event) {
	console.warn(`⚠️ Websocket closed on ${queue.guild.name}: code=${event.code}, reason=${event.reason}`);

	// Codes that mean the voice connection is truly dead and unrecoverable:
	// 4014 = Disconnected (channel deleted, kicked, or bot moved while not in VC)
	// 4004 = Authentication failed
	// 4009 = Session timed out
	const fatalCodes = [4014, 4004, 4009];

	// 4006 = Session no longer valid — Discord killed the voice session.
	// Lavalink won't auto-recover; we must rejoin to get a new session.
	const reconnectCodes = [4006];

	if (fatalCodes.includes(event.code)) {
		if (queue.messageChannel) {
			queue.messageChannel
				.send('⚠️ Voice connection was closed unexpectedly')
				.catch(() => null);
		}
		queue.disconnect();
	} else if (reconnectCodes.includes(event.code)) {
		console.log(`🔄 [Voice] Session invalid (code=${event.code}) on ${queue.guild.name}, attempting to rejoin...`);
		try {
			// Save current state
			const voiceChannel = queue.voiceChannel;
			const tracks = queue.tracks;
			const wasPlaying = !!player.track;

			if (voiceChannel && queue.client?.shoukaku) {
				// Leave and rejoin to get a fresh voice session
				try {
					queue.client.shoukaku.leaveVoiceChannel(queue.guild.id);
				} catch {}

				// Small delay to let Discord clean up the old session
				await new Promise(r => setTimeout(r, 1500));

				const newPlayer = await queue.client.shoukaku.joinVoiceChannel({
					guildId: queue.guild.id,
					channelId: voiceChannel.id,
					shardId: queue.guild.shardId ?? 0
				});

				queue.player = newPlayer;
				attachPlayerEvents(newPlayer, queue);

				console.log(`✅ [Voice] Rejoined ${voiceChannel.name} on ${queue.guild.name}`);

				// Resume playback if there's a track
				const currentTrack = tracks.peekAt(0);
				if (currentTrack && wasPlaying) {
					await newPlayer.playTrack({ track: { encoded: currentTrack.encoded } });
					console.log(`▶️ [Voice] Resumed playback: ${currentTrack.info?.title}`);
				}
			} else {
				console.warn(`⚠️ [Voice] Cannot rejoin — no voice channel reference`);
				queue.disconnect();
			}
		} catch (err) {
			console.error(`❌ [Voice] Failed to rejoin on ${queue.guild.name}:`, err?.message);
			if (queue.messageChannel) {
				queue.messageChannel
					.send('⚠️ Lost voice connection and failed to reconnect')
					.catch(() => null);
			}
			queue.disconnect();
		}
	} else {
		// Truly non-fatal codes (1006 network blip, etc.) — Shoukaku handles reconnection.
		console.log(`🔄 [Voice] Non-fatal websocket close (code=${event.code}) on ${queue.guild.name}, waiting for auto-recovery...`);
	}
}

async function tryAlternateSources(queue, track) {
	if (!track) return null;

	const shoukaku = queue?.client?.shoukaku;
	if (!shoukaku) return null;

	const node = shoukaku.getIdealNode();
	if (!node) return null;

	const query = [track.info?.author, track.info?.title]
		.filter(Boolean)
		.join(' ')
		.trim();

	if (!query.length) {
		return null;
	}

	try {
		const scResult = await node.rest.resolve(`scsearch:${query}`);
		if (scResult?.data && scResult.data.length > 0) {
			return scResult.data[0];
		}
	} catch (error) {
		console.debug('SoundCloud search failed:', error?.message ?? error);
	}

	try {
		const ytResult = await node.rest.resolve(`ytsearch:${query}`);
		if (ytResult?.data && ytResult.data.length > 0) {
			return ytResult.data[0];
		}
	} catch (error) {
		console.debug('YouTube search failed:', error?.message ?? error);
	}

	return null;
}

async function playNext(player, queue) {
	let nextTrack = queue.tracks.peekAt(0);

	if (!nextTrack) {
		console.log(`✅ Queue finished on ${queue.guild.name}`);

		if (queue.currentRecommendationId) {
			expiredRecommendations.add(queue.currentRecommendationId);
			recommendationCache.delete(queue.currentRecommendationId);
			queue.currentRecommendationId = null;
		}
		if (queue.currentRecommendationTimeout) {
			clearTimeout(queue.currentRecommendationTimeout);
			queue.currentRecommendationTimeout = null;
		}

		if (!queue.intentionalStop && queue.messageChannel) {

			if (queue.nowPlayingMessageId) {
				try {
					const lastMsg = await queue.messageChannel.messages.fetch(queue.nowPlayingMessageId);
					const disabled = disableAllComponents(lastMsg.components);
					if (disabled) {
						await lastMsg.edit({ components: disabled, flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
					}
				} catch {}
			}
			const endContainer = buildQueueEndContainer();
			queue.messageChannel
				.send({ components: [endContainer], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } })
				.catch(() => null);
		}

		queue.intentionalStop = false;

		if (queue.is247) {
			return;
		}

		if (queue.disconnectTimeout) {
			clearTimeout(queue.disconnectTimeout);
		}

		const disconnectTimeout = setTimeout(() => {
			if (queue && queue.player && !queue.is247) {
				queue.disconnect();
			}
		}, 5 * 60 * 1000);

		queue.disconnectTimeout = disconnectTimeout;
		return;
	}

	try {

		if (queue.disconnectTimeout) {
			clearTimeout(queue.disconnectTimeout);
			queue.disconnectTimeout = null;
		}

		await player.playTrack({ track: { encoded: nextTrack.encoded } });
	} catch (error) {
		console.error('Failed to play next track:', error.message);

		if (isBackendUnavailableError(error)) {
			if (queue.messageChannel) {
				queue.messageChannel
					.send('⚠️ Lavalink disconnected while starting the next track. Queue is preserved; retry when backend is online.')
					.catch(() => null);
			}
			return;
		}

		queue.tracks.removeOne(0);
		playNext(player, queue);
	}
}

function getDisplayTitle(title) {
	if (!title || typeof title !== 'string') {
		return 'Unknown track';
	}
	let value = title.includes('|') ? title.split('|')[0].trim() : title.trim();
	const parenIndex = value.indexOf('(');
	const bracketIndex = value.indexOf('[');
	let trimIndex = -1;
	if (parenIndex !== -1 && bracketIndex !== -1) {
		trimIndex = Math.min(parenIndex, bracketIndex);
	} else if (parenIndex !== -1) {
		trimIndex = parenIndex;
	} else if (bracketIndex !== -1) {
		trimIndex = bracketIndex;
	}
	if (trimIndex !== -1) {
		value = value.substring(0, trimIndex).trim();
	}
	return value.length ? value.substring(0, 100) : 'Unknown track';
}

async function getAutoplayTrack(queue) {
	if (!queue?.client?.shoukaku) return null;
	const node = queue.client.shoukaku.getIdealNode();
	if (!node) return null;
	const baseInfo = queue.lastPlayedTrackInfo;
	if (!baseInfo) return null;

	if (!queue.autoplayPlaylist) {
		queue.autoplayPlaylist = [];
		queue.autoplayPlaylistIndex = 0;
	}

	if (!queue.autoplayHistory || typeof queue.autoplayHistory.add !== 'function') {
		queue.autoplayHistory = new Set();
	}

	const { language: currentLanguage, genres: currentGenres } = detectLanguageAndGenre(baseInfo.title, baseInfo.author);
	const currentPrimaryGenre = currentGenres[0] ?? 'pop';

	if (queue.lastAutoplayLanguage !== currentLanguage || queue.lastAutoplayGenre !== currentPrimaryGenre) {
		console.log(`🔄 Autoplay: Language/Genre changed from ${queue.lastAutoplayLanguage}/${queue.lastAutoplayGenre} to ${currentLanguage}/${currentPrimaryGenre}`);
		queue.autoplayPlaylist = [];
		queue.autoplayPlaylistIndex = 0;
		queue.lastAutoplayLanguage = currentLanguage;
		queue.lastAutoplayGenre = currentPrimaryGenre;
	}

	if (queue.autoplayPlaylistIndex >= queue.autoplayPlaylist.length) {
		console.log(`🔄 Autoplay: Fetching new playlist for "${baseInfo.title}"...`);
		const newPlaylist = await fetchAutoplayPlaylist(baseInfo, node, queue.autoplayHistory, baseInfo.uri);
		if (!newPlaylist || newPlaylist.length === 0) {
			console.warn(`⚠️ Autoplay: No playlist found`);
			return null;
		}
		queue.autoplayPlaylist = newPlaylist;
		queue.autoplayPlaylistIndex = 0;
		console.log(`✅ Autoplay: Fetched playlist with ${newPlaylist.length} tracks`);
	}

	const track = queue.autoplayPlaylist[queue.autoplayPlaylistIndex];
	queue.autoplayPlaylistIndex++;

	if (track) {

		const currentTrackUri = queue.lastPlayedTrackInfo?.uri;
		if (currentTrackUri && track.info?.uri === currentTrackUri) {
			console.log(`⏭️ Autoplay: Skipping current track - "${track.info.title}"`);

			if (queue.autoplayPlaylistIndex < queue.autoplayPlaylist.length) {
				const nextTrack = queue.autoplayPlaylist[queue.autoplayPlaylistIndex];
				queue.autoplayPlaylistIndex++;
				if (nextTrack) {
					console.log(`✅ Autoplay: Queueing from playlist - ${nextTrack.info.title}`);
					queue.autoplayHistory.add(nextTrack.info.uri);
					return {
						...nextTrack,
						userId: queue.client?.user?.id ?? null,
						requesterName: 'Autoplay'
					};
				}
			}
			return null;
		}

		console.log(`✅ Autoplay: Queueing from playlist - ${track.info.title}`);
		queue.autoplayHistory.add(track.info.uri);
	}

	return track ? {
		...track,
		userId: queue.client?.user?.id ?? null,
		requesterName: 'Autoplay'
	} : null;
}

async function fetchAutoplayPlaylist(trackInfo, node, history, currentTrackUri) {
	try {
		const songTitle = trackInfo?.title ?? '';
		const artist = trackInfo?.author ?? '';

		console.log(`🔍 Autoplay: Detecting language and genre for "${songTitle}"...`);
		const { language, genres, moods } = detectLanguageAndGenre(songTitle, artist);
		const primaryGenre = genres[0] ?? 'pop';
		const primaryMood = moods[0] ?? 'chill';

		console.log(`🎵 Detected: Language=${language}, Genre=${primaryGenre}, Mood=${primaryMood}`);
		console.log(`🔍 Autoplay: Searching Spotify for related playlists...`);

		try {

			const accessToken = await getSpotifyAccessToken();
			if (!accessToken) {
				console.warn(`⚠️ Autoplay: Could not get Spotify access token`);
				return [];
			}

			let searchQuery = '';
			if (language.toLowerCase() === 'hindi') {
				searchQuery = 'Hindi Hits';
			} else if (language.toLowerCase() === 'punjabi') {
				searchQuery = 'Punjabi Hits';
			} else {
				searchQuery = `${language} ${primaryGenre}`;
			}

			console.log(`🔍 Autoplay: Searching Spotify for "${searchQuery}" playlist...`);

			const playlistResponse = await fetch(
				`https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=playlist&limit=1`,
				{
					headers: {
						'Authorization': `Bearer ${accessToken}`
					}
				}
			);

			if (!playlistResponse.ok) {
				console.warn(`⚠️ Autoplay: Spotify playlist search failed`);
				return [];
			}

			const playlistData = await playlistResponse.json();
			const playlist = playlistData.playlists?.items?.[0];

			if (!playlist?.id) {
				console.warn(`⚠️ Autoplay: No playlist found for "${searchQuery}"`);
				return [];
			}

			console.log(`✅ Autoplay: Found Spotify playlist - "${playlist.name}"`);

			const tracksResponse = await fetch(
				`https://api.spotify.com/v1/playlists/${playlist.id}/tracks?limit=50`,
				{
					headers: {
						'Authorization': `Bearer ${accessToken}`
					}
				}
			);

			if (!tracksResponse.ok) {
				console.warn(`⚠️ Autoplay: Failed to fetch playlist tracks`);
				return [];
			}

			const tracksData = await tracksResponse.json();
			const spotifyTracks = tracksData.items || [];

			if (spotifyTracks.length === 0) {
				console.warn(`⚠️ Autoplay: Playlist has no tracks`);
				return [];
			}

			console.log(`✅ Autoplay: Got ${spotifyTracks.length} tracks from Spotify playlist`);

			const filteredTracks = [];
			const seenTitles = new Set();

			for (const item of spotifyTracks) {
				const track = item.track;
				if (!track?.id || !track?.name || !track?.artists?.[0]) continue;

				const trackTitle = `${track.name} ${track.artists[0].name}`;
				const spotifyUri = `spotify:track:${track.id}`;

				const titleLower = trackTitle.toLowerCase();
				if (seenTitles.has(titleLower)) continue;

				if (history && history.has(spotifyUri)) continue;

				seenTitles.add(titleLower);

				try {
					console.log(`� Autoplay: Searching YouTube for "${trackTitle}"...`);
					const searchQuery = `ytsearch:${trackTitle}`;
					const result = await node.rest.resolve(searchQuery);

					if ((result?.loadType === 'search' || result?.loadType === 'SEARCH') && result?.data?.length > 0) {

						const youtubeTrack = result.data[0];
						if (youtubeTrack) {
							filteredTracks.push(youtubeTrack);
							console.log(`✅ Autoplay: Found on YouTube - ${youtubeTrack.info?.title}`);
						}
					} else {
						console.warn(`⚠️ Autoplay: No YouTube results for "${trackTitle}"`);
					}
				} catch (err) {
					console.warn(`⚠️ Autoplay: YouTube search failed for ${trackTitle}:`, err?.message);
				}

				if (filteredTracks.length >= 50) break;
			}

			console.log(`✅ Autoplay: Prepared ${filteredTracks.length} Spotify tracks for playback`);
			return filteredTracks;
		} catch (err) {
			console.error(`⚠️ Autoplay: Spotify fetch failed:`, err?.message);
			return [];
		}
	} catch (error) {
		console.error('Failed to fetch autoplay playlist:', error?.message ?? error);
		return [];
	}
}

function formatDuration(ms) {
	if (!ms || ms < 0) return '0:00';
	const seconds = Math.floor((ms / 1000) % 60);
	const minutes = Math.floor((ms / (1000 * 60)) % 60);
	const hours = Math.floor(ms / (1000 * 60 * 60));

	if (hours > 0) {
		return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
	}
	return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function extractYouTubeId(url) {
	if (!url) return null;
	const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
	return match ? match[1] : null;
}

/**
 * @param {string} url
 * @returns {Promise<Object>}
 */
async function fetchYouTubeStats(url) {
	const videoId = extractYouTubeId(url);
	console.log(`🔍 Fetching stats for URL: ${url}, VideoID: ${videoId}`);
	if (!videoId) {
		console.warn(`⚠️ Could not extract video ID from: ${url}`);
		return { rating: null, trending: false };
	}

	try {
		const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
		console.log(`📡 Fetching from: ${oembedUrl}`);
		const response = await fetch(oembedUrl);

		if (!response.ok) {
			console.warn(`⚠️ Oembed response not ok: ${response.status}`);
			return { rating: null, trending: false };
		}

		const data = await response.json();
		console.log(`✅ Oembed data received:`, data);

		const rating = (4.0 + Math.random() * 1.0).toFixed(1);

		const title = data.title?.toLowerCase() || '';
		const author = data.author_name?.toLowerCase() || '';

		const isTrending =
			title.includes('official') ||
			title.includes('music video') ||
			title.includes('mv') ||
			title.includes('trending') ||
			title.includes('viral') ||
			title.includes('hit') ||
			title.includes('full video') ||
			title.includes('full song') ||
			author.includes('vevo') ||
			author.includes('official') ||
			author.includes('music') ||
			false;

		console.log(`📊 Stats for "${data.title}": Rating=${rating}, Trending=${isTrending}`);
		return { rating, trending: isTrending };
	} catch (error) {
		console.error('❌ Failed to fetch YouTube stats:', error);
		return { rating: null, trending: false };
	}
}

/**
 * @param {string} songTitle
 * @param {string} artist
 * @returns {Object}
 */
function detectLanguageAndGenre(songTitle, artist) {
	const combined = `${songTitle || ''} ${artist || ''}`;
	const textLower = combined.toLowerCase();

	let language = 'english';

	const hasDevanagari = /[\u0900-\u097F\u1CD0-\u1CF6]/.test(combined);

	if (
		hasDevanagari ||
		/\b(hindi|hindustani|hindipop|bollywood|desi|ghazal|filmi|bhajan|raag|raaga|raagam|arijit|arijit singh|pritam|krishna|shruti|tushar|neha|atif|armaan|ranbir|alia|shah rukh|hrithik)\b/.test(textLower) ||
		/\b(dil|tera|meri|tum|hai|nahin|pyar|pyaar|ishq|zindagi|saath|yaar|sajna|rab|mehboob|suno|raat|sapna|yaadon|mahi|aankhon|channa|kesariya|brahmasthra|pathaan|bhool|bhulaiyaa|ghoomar|dilbar|dil diyan gallan|veere|kudiyaan)\b/.test(textLower)
	) {
		language = 'hindi';
	} else if (/\b(punjabi|bhangra|gidha|gurbani|veer|jatt|sardar|sidhu|moosewala|diljit|kaur)\b/.test(textLower)) {
		language = 'punjabi';
	} else if (/\b(spanish|latina|latino|amor|corazón|corazon|noche|día|dia|vida|mi|te|una|para)\b/.test(textLower)) {
		language = 'spanish';
	} else if (/\b(french|français|francais|amour|cœur|coeur|nuit|jour|vie|mon|je|tu)\b/.test(textLower)) {
		language = 'french';
	} else if (/\b(portuguese|português|portugues|coração|coracao|noite|dia|vida|meu|te|você|voce)\b/.test(textLower)) {
		language = 'portuguese';
	} else if (/\b(italian|italiano|amore|cuore|notte|giorno|vita|mio|ti|tuo)\b/.test(textLower)) {
		language = 'italian';
	}

	const genreKeywords = {
		bollywood: /\b(bollywood|hindipop|filmi|soundtrack|ost|ghazal|bhajan|raag|hindustani)\b/i,
		punjabi: /\b(punjabi|bhangra|gidha|desi crew|sidhu|moosewala|diljit|kaur|jatt)\b/i,
		indie: /\b(indie|alternative|underground|bedroom|lo-fi|lofi|acoustic|unplugged)\b/i,
		pop: /\b(pop|catchy|upbeat|dance|party|fun|happy|romantic|hit)\b/i,
		rock: /\b(rock|guitar|metal|hard|heavy|power|band)\b/i,
		jazz: /\b(jazz|smooth|cool|swing|bebop)\b/i,
		rap: /\b(rap|hip-hop|hip hop|hiphop|freestyle|mc|beatbox)\b/i,
		electronic: /\b(electronic|edm|synth|trance|house|techno|digital|electro)\b/i,
		rnb: /\b(r&b|rnb|soul|neo-soul|slow jam)\b/i,
		folk: /\b(folk|acoustic|sufi|baul|lok geet|ghazal)\b/i,
		ballad: /\b(ballad|slow|tender|romantic|love story)\b/i,
		lofi: /\b(lo-fi|lofi|chill|study|vibe)\b/i,
		devotional: /\b(devotional|bhajan|aarti|kirtan|shabad|spiritual)\b/i
	};

	const genres = new Set();
	for (const [genre, regex] of Object.entries(genreKeywords)) {
		if (regex.test(textLower)) {
			genres.add(genre);
		}
	}

	if (!genres.size) {
		genres.add(language === 'hindi' ? 'bollywood' : 'pop');
	}

	const moodKeywords = {
		sad: /\b(sad|broken|cry|tears|hurt|pain|lonely|alone|heartbreak|depression|suffer|ache|dard|dukhi|bewafa|virah|gum|rona|udasi)\b/i,
		romantic: /\b(romantic|romance|love|ishq|pyar|pyaar|sajna|dil|valentine|mohabbat|lover)\b/i,
		chill: /\b(chill|relax|calm|soothing|lofi|unplugged|acoustic|serene|meditation|ambient)\b/i,
		energetic: /\b(energetic|energy|upbeat|dance|party|club|dj|banger|naach|dhoom|anthem)\b/i,
		happy: /\b(happy|joy|smile|sunny|celebrate|khushi|masti|utsav|delight)\b/i,
		devotional: /\b(devotional|bhajan|aarti|kirtan|spiritual|bhakti|shabad|mantra)\b/i,
		motivational: /\b(motivational|inspirational|anthem|victory|jeet|fighter|rise|hustle)\b/i
	};

	const moods = new Set();
	for (const [mood, regex] of Object.entries(moodKeywords)) {
		if (regex.test(textLower)) {
			moods.add(mood);
		}
	}

	if (!moods.size) {
		moods.add('general');
	}

	return {
		language,
		genres: Array.from(genres),
		moods: Array.from(moods)
	};
}

/**
 * @param {string} songTitle
 * @param {string} artist
 * @param {Object} client
 * @param {string} guildId
 * @returns {Promise<Array>}
 */
async function fetchRecommendations(trackInfo, client, guildId) {
	try {
		const node = client.shoukaku?.getIdealNode();
		if (!node) return [];

		const songTitle = trackInfo?.title ?? '';
		const artist = trackInfo?.author ?? '';
		const duration = trackInfo?.length ?? 0;
		const sourceUri = trackInfo?.uri ?? '';

		const { language, genres, moods } = detectLanguageAndGenre(songTitle, artist);
		console.debug(`🎵 Detected: Language=${language}, Genres=${genres.join(', ')}, Moods=${moods.join(', ')}`);

		const primaryGenre = genres[0] ?? 'pop';
		const primaryMood = moods[0] ?? 'popular';
		const moodLabel = primaryMood === 'general' ? null : primaryMood;

		const cleanTitle = songTitle
			.replace(/\[[^]*?\]/g, ' ')
			.replace(/\([^]*?\)/g, ' ')
			.replace(/official\s*(music\s*)?(video)?/gi, ' ')
			.replace(/lyrics?/gi, ' ')
			.replace(/full\s+song/gi, ' ')
			.replace(/\s+/g, ' ')
			.trim();

		const cleanArtist = artist
			.replace(/\[[^]*?\]/g, ' ')
			.replace(/\([^]*?\)/g, ' ')
			.replace(/\s+/g, ' ')
			.trim();

		const querySet = new Set();

		if (cleanTitle && cleanArtist) {
			querySet.add(`${cleanTitle} ${cleanArtist} mix`);
			querySet.add(`${cleanTitle} ${cleanArtist} similar songs`);
			querySet.add(`${cleanTitle} ${cleanArtist} ${language}`);
		}

		if (cleanTitle) {
			querySet.add(`${cleanTitle} ${language} playlist`);
			if (moodLabel) {
				querySet.add(`${cleanTitle} ${moodLabel} ${language}`);
			}
			querySet.add(`${cleanTitle} ${primaryGenre} songs`);
		}

		if (cleanArtist) {
			querySet.add(`${cleanArtist} ${language} ${primaryGenre} ${moodLabel || 'songs'}`);
			querySet.add(`${cleanArtist} ${primaryGenre} playlist`);
			if (moodLabel) {
				querySet.add(`${cleanArtist} ${moodLabel} songs`);
			}
		}

		if (moodLabel) {
			querySet.add(`${language} ${primaryGenre} ${moodLabel} songs`);
		}

		const currentYear = new Date().getFullYear();
		querySet.add(`${language} ${primaryGenre} hits ${currentYear}`);
		querySet.add(`${language} ${primaryGenre} trending songs`);
		querySet.add(`${language} ${primaryGenre} latest songs`);

		const candidates = new Map();
		const skipPatterns = [
			/\b(lyrics?|lyric|with lyrics)\b/i,
			/\b(cover|live|reaction|interview|sample|snippet|tutorial)\b/i,
			/\b(remix|sped up|speed up|nightcore|8d|slowed|reverb)\b/i,
			/\b(karaoke|instrumental|piano|guitar|drum tutorial)\b/i,
			/\b(shorts|tiktok|status|trailer|teaser|promo)\b/i
		];

		const baseTitleLower = cleanTitle.toLowerCase();
		const baseArtistLower = cleanArtist.toLowerCase();

		for (const query of querySet) {
			const search = query.trim();
			if (!search.length) continue;

			console.debug(`🎵 Searching: "${search}"`);

			let result;
			try {
				result = await node.rest.resolve(`ytsearch:${search}`);
			} catch (error) {
				console.debug(`Failed to search for "${search}":`, error.message);
				continue;
			}

			if (!result?.data?.length) continue;

			for (const track of result.data) {
				const info = track.info || {};
				const uri = info.uri;
				if (!uri || uri === sourceUri) continue;

				if (candidates.has(uri)) continue;

				const trackTitle = info.title || '';
				const trackAuthor = info.author || '';

				if (skipPatterns.some((regex) => regex.test(trackTitle) || regex.test(trackAuthor))) {
					continue;
				}

				const candidateMeta = detectLanguageAndGenre(trackTitle, trackAuthor);

				let score = 0;
				if (candidateMeta.language === language) {
					score += 4;
				} else if (language === 'hindi' && /hindi|bollywood/i.test(trackTitle)) {
					score += 2;
				} else if (candidateMeta.language === 'punjabi' && language === 'hindi') {
					score += 1;
				}

				if (candidateMeta.genres.some((g) => genres.includes(g))) {
					score += 2;
				}

				if (candidateMeta.moods.some((m) => moods.includes(m))) {
					score += 2;
				}

				if (baseArtistLower && trackAuthor.toLowerCase().includes(baseArtistLower)) {
					score += 3;
				}

				if (baseTitleLower && trackTitle.toLowerCase().includes(baseTitleLower)) {
					score += 2;
				}

				if (duration && info.length) {
					const diff = Math.abs(info.length - duration);
					if (diff <= 30000) score += 1.5;
					else if (diff <= 90000) score += 0.75;
				}

				if (/official/i.test(trackTitle)) score += 0.3;
				if (/mix|playlist/i.test(trackTitle)) score += 0.5;
				if (/remix|sped up|nightcore|slow|8d/i.test(trackTitle)) score -= 1.5;

				score += Math.random() * 0.3;

				if (score <= 0.2) continue;

				candidates.set(uri, { track, score });
			}
		}

		const sorted = [...candidates.values()].sort((a, b) => b.score - a.score);

		if (!sorted.length) {
			return [];
		}

		console.debug(`🎵 Compiled ${sorted.length} candidate recommendations`);
		return sorted.slice(0, 5).map(({ track }) => track);
	} catch (error) {
		console.debug('Failed to fetch recommendations:', error.message);
		return [];
	}
}

/**
 * @returns {Promise<string|null>}
 */
async function getSpotifyAccessToken() {
	try {
		const clientId = process.env.SPOTIFY_CLIENT_ID;
		const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

		if (!clientId || !clientSecret) {
			console.warn(`⚠️ Autoplay: Spotify credentials not configured`);
			return null;
		}

		const response = await fetch('https://accounts.spotify.com/api/token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
			},
			body: 'grant_type=client_credentials'
		});

		if (!response.ok) {
			console.warn(`⚠️ Autoplay: Failed to get Spotify token - HTTP ${response.status}`);
			return null;
		}

		const data = await response.json();
		return data.access_token;
	} catch (error) {
		console.error('Failed to get Spotify access token:', error?.message);
		return null;
	}
}

export {
	formatDuration,
	recommendationCache,
	expiredRecommendations
};

/**
 * @param {Array} components
 * @returns {Array|null}
 */
function disableAllComponents(components) {
	if (!Array.isArray(components) || components.length === 0) return null;

	const disableRow = (row) => {
		const json = row.toJSON ? row.toJSON() : row;
		const clone = { ...json };
		if (Array.isArray(clone.components)) {
			clone.components = clone.components.map((comp) => ({ ...comp, disabled: true }));
		}
		return clone;
	};

	const isContainer = components.some((top) => {
		const json = top.toJSON ? top.toJSON() : top;
		return Array.isArray(json.components) && json.components.some((c) => Array.isArray(c.components));
	});

	if (isContainer) {
		return components.map((top) => {
			const json = top.toJSON ? top.toJSON() : top;
			const containerClone = { ...json };
			if (Array.isArray(containerClone.components)) {
				containerClone.components = containerClone.components.map(disableRow);
			}
			return containerClone;
		});
	}

	return components.map(disableRow);
}

/**
 * @returns {ContainerBuilder}
 */
function buildQueueEndContainer() {
	const container = new ContainerBuilder();

	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(`# ${EMOJIS.success} Queue Complete`)
	);

	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);

	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent('No more tracks in queue.\n\nLeaving voice channel.')
	);

	return container;
}

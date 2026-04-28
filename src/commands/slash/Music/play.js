import { SlashCommandBuilder, MessageFlags, ContainerBuilder, SeparatorSpacingSize, PermissionFlagsBits } from 'discord.js';
import { Queue } from '../../../utils/Queue.js';
import EMOJIS from '../../../utils/emojis.js';
import { isSpotifyQuery, resolveSpotifyQuery, isEmptyLoadResult } from '../../../utils/spotifyResolver.js';

export default {
	data: new SlashCommandBuilder()
		.setName('play')
		.setDescription('Play a song from YouTube or other sources')
		.addStringOption(option =>
			option.setName('song')
				.setDescription('Song name or URL to play')
				.setRequired(true)
		),

	async execute(interaction, client) {
		if (!interaction.member?.voice.channel) {
			return interaction.reply({
				content: '❌ You must be in a voice channel to use this command.',
				ephemeral: true
			});
		}

		const botMember = interaction.guild.members.me;
		const botPermissions = interaction.member.voice.channel.permissionsFor(botMember);

		if (!botPermissions?.has(PermissionFlagsBits.Connect)) {
			return interaction.reply({
				content: '❌ I don\'t have permission to connect to your voice channel.',
				ephemeral: true
			});
		}

		if (!botPermissions?.has(PermissionFlagsBits.Speak)) {
			return interaction.reply({
				content: '❌ I can join that voice channel, but I do not have permission to speak there.',
				ephemeral: true
			});
		}

		const searchQuery = normalizeSearchQuery(interaction.options.getString('song'));

		await interaction.deferReply();

		try {
			let node = client.shoukaku.getIdealNode();
			if (!node) {
				node = await waitForAvailableNode(client.shoukaku);
			}

			if (!node) {
				return interaction.editReply({
					content: '❌ No Lavalink nodes available. Try again later.',
				});
			}

			let query = searchQuery;
			try {
				new URL(query);
			} catch {
				query = `ytsearch:${query}`;
			}

			let result = await node.rest.resolve(query);

			if (isEmptyLoadResult(result) && isSpotifyQuery(searchQuery)) {
				try {
					result = await resolveSpotifyQuery(searchQuery, node, client.config);
				} catch (spotifyError) {
					console.error('Spotify fallback resolution failed:', spotifyError);

					const spotifyErrorMessage = getSpotifyResolveErrorMessage(spotifyError);
					if (spotifyErrorMessage) {
						return interaction.editReply({
							content: spotifyErrorMessage,
						});
					}
				}
			}

			if (isEmptyLoadResult(result)) {
				return interaction.editReply({
					content: '❌ No results found for: **' + searchQuery + '**',
				});
			}

			let queue = client.queue.get(interaction.guildId);

			if (!queue) {
				queue = new Queue({
					client,
					guild: interaction.guild,
					voiceChannel: interaction.member.voice.channel,
					messageChannel: interaction.channel
				});

				await queue.connect();
				client.queue.set(interaction.guildId, queue);
			} else {
				queue.voiceChannel = interaction.member.voice.channel;
				queue.messageChannel = interaction.channel;
				if (!queue.player) {
					await queue.connect();
				}
			}

			if (result.loadType === 'playlist') {
				const playlistTracks = result.data.tracks ?? result.data;
				const tracks = Array.isArray(playlistTracks) ? playlistTracks : [];
				const userTracks = tracks.map(track => ({
					...track,
					userId: interaction.user.id
				}));
				queue.addTrack(userTracks);

				const playlistName = result.data?.info?.name ?? result.playlist?.name ?? 'Unknown Playlist';
				const container = new ContainerBuilder();
				const playlistInfo =
					`${EMOJIS?.success || '✅'} **${playlistName}**\n\n` +
					`Added **${tracks.length}** songs\n` +
					`Queued by: ${interaction.user.toString()}`;

				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(playlistInfo)
				);

				await interaction.editReply({ content: null, components: [container], flags: MessageFlags.IsComponentsV2 });
			} else {
				const track = result.loadType === 'track' ? result.data : result.data[0];

				if (!track || !track.info) {
					return interaction.editReply({
						content: '❌ Could not extract track information. The URL or search result may be invalid.',
					});
				}

				const userTrack = {
					...track,
					userId: interaction.user.id
				};
				queue.addTrack(userTrack);

				const container = new ContainerBuilder();

				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ${EMOJIS?.success || '✅'} | Track Added`)
				);

				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);

				const displayTitle = (() => {
					let title = track.info.title.includes('|')
						? track.info.title.split('|')[0].trim()
						: track.info.title;

					const parenIndex = title.indexOf('(');
					const bracketIndex = title.indexOf('[');

					let trimIndex = -1;
					if (parenIndex !== -1 && bracketIndex !== -1) {
						trimIndex = Math.min(parenIndex, bracketIndex);
					} else if (parenIndex !== -1) {
						trimIndex = parenIndex;
					} else if (bracketIndex !== -1) {
						trimIndex = bracketIndex;
					}

					return trimIndex !== -1
						? title.substring(0, trimIndex).trim()
						: title;
				})();

				const thumbnailUrl = track.info.artworkUrl ||
					(track.info.uri?.includes('youtube.com') || track.info.uri?.includes('youtu.be')
						? `https://img.youtube.com/vi/${extractYouTubeId(track.info.uri)}/mqdefault.jpg`
						: null);

				container.addSectionComponents((section) => {
					const trackInfo =
						`**${EMOJIS?.ytmusic || '✅'} [${displayTitle}](${track.info.uri || 'https://unknown'})**\n` +
						`**via ➜ ${track.info.author}**\n\n` +
						`Duration: \`${formatTime(track.info.length)}\`\n` +
						`Queued by: ${interaction.user.toString()}`;

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

				await interaction.editReply({ content: null, components: [container], flags: MessageFlags.IsComponentsV2 });
			}

			const isIdle = !queue.player?.track && !queue.paused;
			const shouldStart = queue.stopped || isIdle;

			if (shouldStart) {
				try {
					await queue.play();
				} catch (playError) {
					console.error('Failed to start playback:', playError);
					await interaction.followUp({
						content: isMusicBackendUnavailable(playError)
							? '⚠️ The track was added to queue, but playback could not start because Lavalink is offline.'
							: '⚠️ The track was added to queue, but playback could not start right now.',
						ephemeral: true
					}).catch(() => {});
				}
			}
		} catch (error) {
			console.error('Error in play command:', error);
			interaction.editReply({
				content: isMusicBackendUnavailable(error)
					? '❌ Music backend is offline. Please check your Lavalink node and try again.'
					: '❌ An error occurred while searching for the track.',
			});
		}
	}
};

function isMusicBackendUnavailable(error) {
	const message = error?.message ?? '';
	if (error?.code === 'LAVALINK_UNAVAILABLE') {
		return true;
	}

	return /ECONNREFUSED|EHOSTUNREACH|ENOTFOUND|No nodes are available|No Lavalink nodes available|No Lavalink node is currently connected|Music backend is currently unavailable|WebSocket is not open|connection refused/i.test(message);
}

function normalizeSearchQuery(input) {
	if (typeof input !== 'string') {
		return '';
	}

	const trimmed = input.trim();
	const wrapped = trimmed.match(/^<(.+)>$/);
	return wrapped ? wrapped[1].trim() : trimmed;
}

function getSpotifyResolveErrorMessage(error) {
	const code = error?.code;

	if (code === 'SPOTIFY_CREDENTIALS_MISSING') {
		return '❌ Spotify links require Spotify API credentials.\nSet SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET on your host and restart the bot.';
	}

	if (code === 'SPOTIFY_TOKEN_REQUEST_FAILED') {
		return '❌ Spotify authentication failed. Verify SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET, then restart the bot.';
	}

	if (code === 'SPOTIFY_API_REQUEST_FAILED') {
		return '❌ Spotify API request failed. The playlist may be private or your credentials may be invalid.';
	}

	if (code === 'SPOTIFY_EMPTY_SOURCE') {
		return '❌ Spotify returned no playable tracks for this link.';
	}

	if (code === 'SPOTIFY_RESOLVE_FAILED') {
		return '❌ Spotify tracks were found, but Lavalink could not resolve playable sources from them.';
	}

	return null;
}

async function waitForAvailableNode(shoukaku, timeoutMs = 12000, intervalMs = 500) {
	if (!shoukaku || typeof shoukaku.getIdealNode !== 'function') {
		return null;
	}

	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const node = shoukaku.getIdealNode();
		if (node) {
			return node;
		}

		await new Promise((resolve) => setTimeout(resolve, intervalMs));
	}

	return null;
}

function formatTime(ms) {
	if (!ms || ms < 0) return '0:00';
	const seconds = Math.floor((ms / 1000) % 60);
	const minutes = Math.floor((ms / (1000 * 60)) % 60);
	const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);

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

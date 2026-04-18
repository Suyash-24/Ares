import { MessageFlags, ContainerBuilder, SeparatorSpacingSize, PermissionFlagsBits } from 'discord.js';
import { Queue } from '../../../utils/Queue.js';
import EMOJIS from '../../../utils/emojis.js';

export default {
	name: 'play',
	description: 'Play a song from YouTube or other sources',
	aliases: ['p'],
	usage: 'play <song name or URL>',
	category: 'Music',
	components: [],

	async execute(message, args, client) {
		if (!message.member?.voice.channel) {
			return message.reply({
				content: '❌ You must be in a voice channel to use this command.',
				allowedMentions: { repliedUser: false }
			});
		}

		const botMember = message.guild.members.me;
		const botPermissions = message.member.voice.channel.permissionsFor(botMember);

		if (!botPermissions?.has(PermissionFlagsBits.Connect)) {
			return message.reply({
				content: '❌ I don\'t have permission to connect to your voice channel.',
				allowedMentions: { repliedUser: false }
			});
		}

		if (!botPermissions?.has(PermissionFlagsBits.Speak)) {
			return message.reply({
				content: '❌ I can join that voice channel, but I do not have permission to speak there.',
				allowedMentions: { repliedUser: false }
			});
		}

		if (!args.length) {
			return message.reply({
				content: '❌ Please provide a song name or URL.\nUsage: `' + client.prefix + 'play <song name or URL>`',
				allowedMentions: { repliedUser: false }
			});
		}

		const searchQuery = args.join(' ');
		const loading = await message.reply({
			content: '🔍 Searching for: **' + searchQuery + '**',
			allowedMentions: { repliedUser: false }
		});

		try {

			const node = client.shoukaku.getIdealNode();
			if (!node) {
				return loading.edit({
					content: '❌ No Lavalink nodes available. Try again later.',
					allowedMentions: { repliedUser: false }
				});
			}

			let query = searchQuery;
			try {
				new URL(query);
			} catch {
				query = `ytsearch:${query}`;
			}

			const result = await node.rest.resolve(query);

			if (!result?.data || (Array.isArray(result.data) && result.data.length === 0) || result.loadType === 'empty' || result.loadType === 'error') {
				return loading.edit({
					content: '❌ No results found for: **' + searchQuery + '**',
					allowedMentions: { repliedUser: false }
				});
			}

			let queue = client.queue.get(message.guildId);

			if (!queue) {
				queue = new Queue({
					client,
					guild: message.guild,
					voiceChannel: message.member.voice.channel,
					messageChannel: message.channel
				});

				await queue.connect();
				client.queue.set(message.guildId, queue);
			} else {
				queue.voiceChannel = message.member.voice.channel;
				queue.messageChannel = message.channel;
				if (!queue.player) {
					await queue.connect();
				}
			}

			if (result.loadType === 'playlist') {
				const userTracks = result.data.map(track => ({
					...track,
					userId: message.author.id
				}));
				queue.addTrack(userTracks);

				const container = new ContainerBuilder();
				const playlistInfo =
					`${EMOJIS?.success || '✅'} **${result.playlist?.name || 'Unknown Playlist'}**\n\n` +
					`Added **${result.data.length}** songs\n` +
					`Queued by: ${message.author.toString()}`;

				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(playlistInfo)
				);

				await loading.edit({ content: null, components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
			} else {

				const track = result.loadType === 'track' ? result.data : result.data[0];

				if (!track || !track.info) {
					return loading.edit({
						content: '❌ Could not extract track information. The URL or search result may be invalid.',
						allowedMentions: { repliedUser: false }
					});
				}

				const userTrack = {
					...track,
					userId: message.author.id
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
						`Queued by: ${message.author.toString()}`;

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

				await loading.edit({ content: null, components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
			}

			const isIdle = !queue.player?.track && !queue.paused;
			const shouldStart = queue.stopped || isIdle;

			if (shouldStart) {
				try {
					await queue.play();
				} catch (playError) {
					console.error('Failed to start playback:', playError);
					await message.channel.send({
						content: isMusicBackendUnavailable(playError)
							? '⚠️ The track was added to queue, but playback could not start because Lavalink is offline.'
							: '⚠️ The track was added to queue, but playback could not start right now.',
						allowedMentions: { repliedUser: false }
					}).catch(() => {});
				}
			}
		} catch (error) {
			console.error('Error in play command:', error);
			loading.edit({
				content: isMusicBackendUnavailable(error)
					? '❌ Music backend is offline. Please check your Lavalink node and try again.'
					: '❌ An error occurred while searching for the track.',
				allowedMentions: { repliedUser: false }
			});
		}
	}
};

function isMusicBackendUnavailable(error) {
	const message = error?.message ?? '';
	if (error?.code === 'LAVALINK_UNAVAILABLE') {
		return true;
	}

	return /ECONNREFUSED|EHOSTUNREACH|ENOTFOUND|No nodes are available|No Lavalink node is currently connected|Music backend is currently unavailable|WebSocket is not open|connection refused/i.test(message);
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

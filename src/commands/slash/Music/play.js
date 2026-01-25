import { SlashCommandBuilder, MessageFlags, ContainerBuilder, SeparatorSpacingSize } from 'discord.js';
import { Queue } from '../../../utils/Queue.js';
import EMOJIS from '../../../utils/emojis.js';

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

		if (!interaction.guild.members.me?.permissions.has('Connect')) {
			return interaction.reply({
				content: '❌ I don\'t have permission to connect to your voice channel.',
				ephemeral: true
			});
		}

		const searchQuery = interaction.options.getString('song');

		await interaction.deferReply();

		try {
			const node = client.shoukaku.getIdealNode();
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

			const result = await node.rest.resolve(query);

			if (!result?.data || result.data.length === 0) {
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

			if (result.loadType === 'PLAYLIST') {
				const userTracks = result.data.map(track => ({
					...track,
					userId: interaction.user.id
				}));
				queue.addTrack(userTracks);

				const container = new ContainerBuilder();
				const playlistInfo =
					`${EMOJIS?.success || '✅'} **${result.playlist?.name || 'Unknown Playlist'}**\n\n` +
					`Added **${result.data.length}** songs\n` +
					`Queued by: ${interaction.user.toString()}`;

				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(playlistInfo)
				);

				await interaction.editReply({ content: null, components: [container], flags: MessageFlags.IsComponentsV2 });
			} else {
				const track = result.data[0];

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
			let shouldStart = queue.stopped || isIdle;

			if (shouldStart) {
				await queue.play();
			}
		} catch (error) {
			console.error('Error in play command:', error);
			interaction.editReply({
				content: '❌ An error occurred while searching for the track.',
			});
		}
	}
};

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

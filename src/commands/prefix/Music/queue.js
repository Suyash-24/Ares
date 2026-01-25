import { ContainerBuilder, MessageFlags, SeparatorSpacingSize, ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

export default {
	name: 'queue',
	description: 'Show the current music queue',
	aliases: ['q'],
	category: 'Music',

	async execute(message, args, client) {
		const queue = client.queue.get(message.guildId);

		if (!queue || queue.stopped || !queue.tracks.peekAt(0)) {
			return message.reply({
				content: '❌ I\'m not playing any music.',
				allowedMentions: { repliedUser: false }
			});
		}

		try {
			const page = Math.max(0, parseInt(args[0]) || 0);
			const pageSize = 4;
			const allTracks = queue.tracks.toArray().slice(1);
			const totalPages = allTracks.length > 0 ? Math.ceil(allTracks.length / pageSize) : 1;
			const currentPage = Math.min(page, Math.max(0, totalPages - 1));

			const current = queue.tracks.peekAt(0);
			const paginatedTracks = allTracks.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
			const totalDuration = allTracks.reduce((sum, track) => sum + (track.info.length || 0), 0);

			let description = `**Now Playing:**\n**[${trimSongName(current.info.title)}](${current.info.uri || 'https://unknown'})**\nby **${current.info.author}**\n\`${formatTime(current.info.length)}\`\n\n`;

			if (paginatedTracks.length > 0) {
				description += `**Up Next (Page ${currentPage + 1}/${totalPages}):**\n`;
				paginatedTracks.forEach((track, index) => {
					const trackNum = currentPage * pageSize + index + 1;
					description += `${trackNum}. **[${trimSongName(track.info.title)}](${track.info.uri || 'https://unknown'})** (\`${formatTime(track.info.length)}\`)\n`;
				});
			} else {
				description += '**Queue is empty** - This is the last track.';
			}

			const container = buildQueueContainer({
				description,
				totalTracks: queue.tracks.length,
				totalDuration: formatTime(totalDuration),
				currentPage,
				totalPages,
				guildId: message.guildId
			});

			message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		} catch (error) {
			console.error('Error in queue command:', error);
			message.reply({
				content: '❌ An error occurred while fetching the queue.',
				allowedMentions: { repliedUser: false }
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

function trimSongName(name) {
	const pipeIndex = name.indexOf('|');
	return pipeIndex !== -1 ? name.substring(0, pipeIndex).trim() : name;
}

function buildQueueContainer({ description, totalTracks, totalDuration, currentPage, totalPages, guildId }) {
	const container = new ContainerBuilder();

	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(`# ${EMOJIS.ytmusic} Music Queue`)
	);

	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);

	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(description)
	);

	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);

	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(`📊 Total: ${totalTracks} track${totalTracks === 1 ? '' : 's'} (${totalDuration})`)
	);

	if (totalPages > 1) {
		container.addSeparatorComponents((separator) =>
			separator.setSpacing(SeparatorSpacingSize.Small)
		);

		container.addActionRowComponents((row) => {
			const prevBtn = new ButtonBuilder()
				.setCustomId(`queue-prev-${guildId}-${currentPage}`)
				.setEmoji(EMOJIS.pageprevious)
				.setStyle(ButtonStyle.Primary)
				.setDisabled(currentPage === 0);

			const homeBtn = new ButtonBuilder()
				.setCustomId(`queue-home-${guildId}-${currentPage}`)
				.setEmoji(EMOJIS.homepage)
				.setStyle(ButtonStyle.Success)
				.setDisabled(false);

			const nextBtn = new ButtonBuilder()
				.setCustomId(`queue-next-${guildId}-${currentPage}`)
				.setEmoji(EMOJIS.pagenext)
				.setStyle(ButtonStyle.Primary)
				.setDisabled(currentPage >= totalPages - 1);

			row.setComponents(prevBtn, homeBtn, nextBtn);
			return row;
		});
	}

	return container;
}

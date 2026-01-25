import { SlashCommandBuilder, MessageFlags, ContainerBuilder } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

export default {
	data: new SlashCommandBuilder()
		.setName('nowplaying')
		.setDescription('Show the currently playing track'),

	async execute(interaction, client) {
		const queue = client.queue.get(interaction.guildId);

		if (!queue || queue.stopped || !queue.tracks.peekAt(0)) {
			return interaction.reply({
				content: '❌ I\'m not playing any music.',
				ephemeral: true
			});
		}

		try {
			const track = queue.tracks.peekAt(0);
			const remainingTracks = queue.tracks.length - 1;

			const container = new ContainerBuilder();
			const nowPlayingInfo =
				`${EMOJIS?.success || '🎵'} **Now Playing**\n\n` +
				`[${track.info.title}](${track.info.uri || 'https://unknown'})\n` +
				`by **${track.info.author || 'Unknown'}**\n\n` +
				`**Status:** ${queue.paused ? '⏸️ Paused' : '▶️ Playing'}\n` +
				`**Duration:** \`${formatTime(track.info.length)}\`\n` +
				`**Queue Position:** ${remainingTracks} track${remainingTracks === 1 ? '' : 's'} remaining\n` +
				`**Loop Mode:** ${queue.repeat || 'OFF'}\n` +
				`**Requested by:** <@${track.userId || 'Unknown'}>`;

			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(nowPlayingInfo)
			);

			interaction.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2
			});
		} catch (error) {
			console.error('Error in nowplaying command:', error);
			interaction.reply({
				content: '❌ An error occurred while fetching the current track.',
				ephemeral: true
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

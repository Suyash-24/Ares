import { SlashCommandBuilder, MessageFlags, ContainerBuilder, SeparatorSpacingSize } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

export default {
	data: new SlashCommandBuilder()
		.setName('clear')
		.setDescription('Clear the entire music queue'),

	async execute(interaction, client) {
		if (!interaction.member?.voice.channel) {
			return interaction.reply({
				content: '❌ You must be in a voice channel to use this command.',
				ephemeral: true
			});
		}

		const queue = client.queue.get(interaction.guildId);

		if (!queue || queue.stopped) {
			return interaction.reply({
				content: '❌ I\'m not playing any music.',
				ephemeral: true
			});
		}

		if (interaction.member.voice.channelId !== queue.voiceChannel.id) {
			return interaction.reply({
				content: '❌ You must be in the same voice channel as me.',
				ephemeral: true
			});
		}

		if (queue.tracks.length <= 1) {
			return interaction.reply({
				content: '❌ The queue is already empty (only current track exists).',
				ephemeral: true
			});
		}

		try {
			const queueLength = queue.tracks.length - 1;
			const current = queue.tracks.peekAt(0);
			queue.clear();
			if (current) {
				queue.addTrack(current);
			}

			const container = buildClearContainer({
				cleared: queueLength
			});

			interaction.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
			});
		} catch (error) {
			console.error('Error in clear command:', error);
			interaction.reply({
				content: '❌ An error occurred while clearing the queue.',
				ephemeral: true
			});
		}
	}
};

function buildClearContainer({ cleared }) {
	const container = new ContainerBuilder();

	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(`# ${EMOJIS.success || '✅'} | Queue Cleared`)
	);

	container.addSeparatorComponents((separator) =>
		separator.setSpacing(SeparatorSpacingSize.Small)
	);

	container.addTextDisplayComponents((textDisplay) =>
		textDisplay.setContent(`**${cleared}** track${cleared === 1 ? '' : 's'} removed\n\nThe current track remains in the queue.`)
	);

	return container;
}

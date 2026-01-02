import { SlashCommandBuilder, MessageFlags, ContainerBuilder, SeparatorSpacingSize } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

export default {
	data: new SlashCommandBuilder()
		.setName('pause')
		.setDescription('Pause the currently playing music'),

	async execute(interaction, client) {
		if (!interaction.member?.voice.channel) {
			return interaction.reply({
				content: '❌ You must be in a voice channel to use this command.',
				ephemeral: true
			});
		}

		const queue = client.queue.get(interaction.guildId);

		if (!queue || !queue.player || !queue.tracks || queue.tracks.size === 0) {
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

		if (queue.paused) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.pause} Already Paused`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent('Music is already paused.')
			);

			return interaction.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				ephemeral: true
			});
		}

		try {
			await queue.setPaused(true);
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.pause} Paused`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent('Paused the music.')
			);

			interaction.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
			});
		} catch (error) {
			console.error('Error in pause command:', error);
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.error} Error`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent('An error occurred while pausing the music.')
			);

			interaction.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				ephemeral: true
			});
		}
	}
};

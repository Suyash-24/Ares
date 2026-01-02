import { ContainerBuilder, MessageFlags, SeparatorSpacingSize } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

export default {
	name: 'pause',
	description: 'Pause the currently playing music',
	category: 'Music',

	async execute(message, args, client) {

		if (!message.member?.voice.channel) {
			return message.reply({
				content: '❌ You must be in a voice channel to use this command.',
				allowedMentions: { repliedUser: false }
			});
		}

		const queue = client.queue.get(message.guildId);

		if (!queue || !queue.player || !queue.tracks || queue.tracks.size === 0) {
			return message.reply({
				content: '❌ I\'m not playing any music.',
				allowedMentions: { repliedUser: false }
			});
		}

		if (message.member.voice.channelId !== queue.voiceChannel.id) {
			return message.reply({
				content: '❌ You must be in the same voice channel as me.',
				allowedMentions: { repliedUser: false }
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

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
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

			message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
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

			message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}
	}
};

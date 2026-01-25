import { ContainerBuilder, MessageFlags, SeparatorSpacingSize } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

export default {
	name: '247',
	description: 'Toggle 24/7 mode - bot stays in voice channel indefinitely',
	aliases: ['stay'],
	category: 'Music',

	async execute(message, args, client) {
		if (!message.member?.voice.channel) {
			return message.reply({
				content: '❌ You must be in a voice channel to use this command.',
				allowedMentions: { repliedUser: false }
			});
		}

		const userChannel = message.member.voice.channel;
		let queue = client.queue.get(message.guildId);

		if (!queue || !queue.player) {
			if (!message.guild.members.me?.permissions.has('Connect')) {
				return message.reply({
					content: '❌ I don\'t have permission to connect to your voice channel.',
					allowedMentions: { repliedUser: false }
				});
			}

			const { Queue } = await import('../../../utils/Queue.js');

			try {
				queue = new Queue({
					client,
					guild: message.guild,
					voiceChannel: userChannel,
					messageChannel: message.channel
				});

				await queue.connect();
				client.queue.set(message.guildId, queue);
			} catch (error) {
				console.error('Error connecting to voice channel:', error);
				return message.reply({
					content: '❌ Failed to connect to your voice channel.',
					allowedMentions: { repliedUser: false }
				});
			}
		} else if (message.member.voice.channelId !== queue.voiceChannel.id) {
			return message.reply({
				content: '❌ You must be in the same voice channel as me.',
				allowedMentions: { repliedUser: false }
			});
		}

		try {
			queue.is247 = !queue.is247;

			const container = new ContainerBuilder();
			const status = queue.is247 ? 'Enabled' : 'Disabled';
			const emoji = queue.is247 ? EMOJIS.success : EMOJIS.error;
			const description = queue.is247
				? 'Bot will stay in voice channel indefinitely.\nMusic will stop, but bot won\'t leave.'
				: 'Bot will not stay in voice channel for 24/7.';

			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${emoji} 24/7 Mode ${status}`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(description)
			);

			message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		} catch (error) {
			console.error('Error in 247 command:', error);
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.error} Error`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent('An error occurred while toggling 24/7 mode.')
			);

			message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}
	}
};

import { ContainerBuilder, MessageFlags, SeparatorSpacingSize, ChannelType } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

export default {
	name: 'join',
	description: 'Join a voice channel',
	aliases: ['connect'],
	usage: 'join [channel]',
	category: 'Music',

	async execute(message, args, client) {
		let targetChannel;

		if (!args.length) {
			if (!message.member?.voice.channel) {
				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ❌ No Channel Specified`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent('You must be in a voice channel or mention a channel.\n\nUsage: `' + client.prefix + 'join [channel]`')
				);

				return message.reply({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			}
			targetChannel = message.member.voice.channel;
		} else {
			const mention = args[0];

			const channelMention = message.mentions.channels.first();
			if (channelMention) {
				targetChannel = channelMention;
			} else {

				try {
					targetChannel = await message.guild.channels.fetch(mention);
				} catch {
					const container = new ContainerBuilder();
					container.addTextDisplayComponents((textDisplay) =>
						textDisplay.setContent(`# ❌ Channel Not Found`)
					);
					container.addSeparatorComponents((separator) =>
						separator.setSpacing(SeparatorSpacingSize.Small)
					);
					container.addTextDisplayComponents((textDisplay) =>
						textDisplay.setContent('Could not find the specified channel.')
					);

					return message.reply({
						components: [container],
						flags: MessageFlags.IsComponentsV2,
						allowedMentions: { repliedUser: false }
					});
				}
			}
		}

		if (!targetChannel || targetChannel.type !== ChannelType.GuildVoice) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ❌ Invalid Channel`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent('The specified channel is not a voice channel.')
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		if (!message.guild.members.me?.permissions.has('Connect')) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ❌ Permission Denied`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent('I don\'t have permission to connect to voice channels.')
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		if (!message.guild.members.me?.permissionsIn(targetChannel).has('Connect')) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ❌ No Access`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`I don't have permission to connect to **${targetChannel.name}**.`)
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		try {
			const { Queue } = await import('../../../utils/Queue.js');

			let queue = client.queue.get(message.guildId);

			if (queue && queue.player) {
				queue.disconnect();
				client.queue.delete(message.guildId);
			}

			queue = new Queue({
				client,
				guild: message.guild,
				voiceChannel: targetChannel,
				messageChannel: message.channel
			});

			await queue.connect();
			client.queue.set(message.guildId, queue);

			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.play} Connected`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`Joined **${targetChannel.name}**.`)
			);

			message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		} catch (error) {
			console.error('Error in join command:', error);
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.error} Error`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent('Failed to join the voice channel.')
			);

			message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}
	}
};

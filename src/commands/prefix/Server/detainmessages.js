import { ContainerBuilder, MessageFlags, SeparatorSpacingSize } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';

export default {
	name: 'detainmessages',
	description: 'Customize detain system messages',
	usage: 'detainmessages <set|view|reset> [type] [message]',
	category: 'Server',

	async execute(message, args, client) {

		if (!message.member.permissions.has('ManageGuild')) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ❌ Permission Denied`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent('You need the **Manage Guild** permission to use this command.')
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		if (!args.length) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ❌ Missing Arguments`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(
					`**Usage:** \`${client.prefix}detainmessages <set|view|reset> [type] [message]\`\n\n` +
					`**Types:**\n` +
					`• \`detain\` - Message sent to user when detained\n` +
					`• \`release\` - Message sent to user when released\n` +
					`• \`response\` - Response message for moderator\n\n` +
					`**Variables:** {user}, {duration}, {reason}, {moderator}\n\n` +
					`**Examples:**\n` +
					`\`${client.prefix}detainmessages set detain You have been detained for {duration}. Reason: {reason}\`\n` +
					`\`${client.prefix}detainmessages view\`\n` +
					`\`${client.prefix}detainmessages reset\``
				)
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const action = args[0].toLowerCase();
		const type = args[1]?.toLowerCase();
		const messageContent = args.slice(2).join(' ');

		if (action === 'view') {
			try {
				const guildData = await client.db.findOne({ guildId: message.guildId });
				const messages = guildData?.moderation?.detainMessages || {};

				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# 📝 Detain Messages Configuration`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);

				const defaultMessages = {
					detain: 'You have been detained for {duration}. Reason: {reason}',
					release: 'You have been released from detention.',
					response: '{user} has been detained for {duration}. Reason: {reason}'
				};

				let config = `**Detain DM Message:**\n\`\`\`\n${messages.detain || defaultMessages.detain}\n\`\`\`\n\n`;
				config += `**Release DM Message:**\n\`\`\`\n${messages.release || defaultMessages.release}\n\`\`\`\n\n`;
				config += `**Response Message:**\n\`\`\`\n${messages.response || defaultMessages.response}\n\`\`\``;

				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(config)
				);

				return message.reply({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			} catch (error) {
				console.error('Error viewing detain messages:', error);
				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ❌ Error`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent('An error occurred while retrieving messages.')
				);

				return message.reply({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			}
		} else if (action === 'set') {
			if (!type || !messageContent) {
				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ❌ Missing Arguments`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(
						`**Usage:** \`${client.prefix}detainmessages set <detain|release|response> <message>\`\n\n` +
						`**Variables:** {user}, {duration}, {reason}, {moderator}`
					)
				);

				return message.reply({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			}

			const validTypes = ['detain', 'release', 'response'];
			if (!validTypes.includes(type)) {
				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ❌ Invalid Type`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`Valid types: ${validTypes.join(', ')}`)
				);

				return message.reply({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			}

			try {
				let guildData = await client.db.findOne({ guildId: message.guildId });

				if (!guildData) {
					guildData = {
						guildId: message.guildId,
						moderation: {
							supportRoles: [],
							modRoles: [],
							headmodRoles: [],
							detainMessages: {}
						}
					};
				}

				if (!guildData.moderation) {
					guildData.moderation = {
						supportRoles: [],
						modRoles: [],
						headmodRoles: [],
						detainMessages: {}
					};
				}

				if (!guildData.moderation.detainMessages) {
					guildData.moderation.detainMessages = {};
				}

				guildData.moderation.detainMessages[type] = messageContent;
				await client.db.updateOne({ guildId: message.guildId }, guildData, { upsert: true });

				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ✅ Message Updated`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(
						`**Type:** ${type}\n\n` +
						`**New Message:**\n\`\`\`\n${messageContent}\n\`\`\``
					)
				);

				return message.reply({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			} catch (error) {
				console.error('Error updating detain message:', error);
				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ❌ Error`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent('An error occurred while updating the message.')
				);

				return message.reply({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			}
		} else if (action === 'reset') {
			try {
				let guildData = await client.db.findOne({ guildId: message.guildId });

				if (guildData && guildData.moderation) {
					guildData.moderation.detainMessages = {};
					await client.db.updateOne({ guildId: message.guildId }, guildData);
				}

				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ✅ Messages Reset`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent('All detain messages have been reset to defaults.')
				);

				return message.reply({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			} catch (error) {
				console.error('Error resetting detain messages:', error);
				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ❌ Error`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent('An error occurred while resetting messages.')
				);

				return message.reply({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			}
		} else {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ❌ Invalid Action`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`Valid actions: \`set\`, \`view\`, \`reset\``)
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}
	}
};

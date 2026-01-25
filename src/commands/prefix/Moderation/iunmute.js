import { ContainerBuilder, MessageFlags, SeparatorSpacingSize } from 'discord.js';
import { ModerationPermissions, getModerationPermissionErrors } from '../../../utils/ModerationPermissions.js';
import { parseUserInput } from '../../../utils/userParser.js';
import { formatUserDisplay } from '../../../utils/userFormatter.js';
import EMOJIS from '../../../utils/emojis.js';
import { markCommandInvoker } from '../../../events/loggingEvents.js';
import { sendLog, LOG_EVENTS } from '../../../utils/LoggingManager.js';

const generateCaseNumber = (guildData) => {
	if (!guildData.moderation) guildData.moderation = {};
	if (!guildData.moderation.actions) guildData.moderation.actions = [];
	return guildData.moderation.actions.length + 1;
};

export default {
	name: 'iunmute',
	description: 'Restore a member\'s attach files & embed links permission',
	usage: 'iunmute <user> <reason>',
	category: 'Moderation',

	async execute(message, args, client) {
		if (args.length < 2) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ❌ Missing Arguments`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`Please specify a user and reason.\nUsage: \`${client.prefix}iunmute <user> <reason>\``)
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const canUse = await ModerationPermissions.canUseCommand(message.member, 'unmute', client, message.guildId);
		if (!canUse.allowed) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ❌ Permission Denied`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(getModerationPermissionErrors[canUse.reason])
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const target = await parseUserInput(args[0], message.guild, client);
		if (!target) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ❌ User Not Found`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent('Could not find the specified user.')
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		if (target.user.bot) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ❌ Cannot Unmute Bot`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent('You cannot unmute a bot.')
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const reason = args.slice(1).join(' ');

		try {
			if (!client.db) {
				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ${EMOJIS.error} Error`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent('Database connection not available.')
				);

				return message.reply({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			}

			const guildData = await client.db.findOne({ guildId: message.guildId });

			let finalGuildData = guildData || {
				guildId: message.guildId,
				moderation: {
					supportRoles: [],
					modRoles: [],
					headmodRoles: [],
					actions: []
				}
			};

			if (!finalGuildData.moderation) {
				finalGuildData.moderation = {
					supportRoles: [],
					modRoles: [],
					headmodRoles: [],
					actions: []
				};
			}

			if (!finalGuildData.moderation.actions) {
				finalGuildData.moderation.actions = [];
			}

			markCommandInvoker(message.guild.id, 'iunmute', target.id, message.author);

			await sendLog(client, message.guildId, LOG_EVENTS.MOD_IUNMUTE, {
				executor: message.author,
				target: target.user,
				reason: reason,
				userId: target.id,
				thumbnail: target.user.displayAvatarURL()
			});

			const channels = await message.guild.channels.fetch();
			let channelsUpdated = 0;

			for (const [channelId, channel] of channels) {
				if (!channel) continue;

				try {
					await channel.permissionOverwrites.edit(target.id, {
						AttachFiles: null,
						EmbedLinks: null
					});
					channelsUpdated++;
				} catch (err) {
					console.log(`Could not remove permissions in channel ${channel.name}:`, err.message);
				}
			}

			const caseNumber = generateCaseNumber(finalGuildData);
			finalGuildData.moderation.actions.push({
				caseNumber,
				type: 'iunmute',
				userId: target.id,
				moderator: { id: message.author.id, username: message.author.username },
				reason,
				timestamp: new Date()
			});

			await client.db.updateOne(
				{ guildId: message.guildId },
				{ $set: finalGuildData }
			);

			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# 🔊 Member Interaction Restored`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(
					`**User:** ${formatUserDisplay(target.user)}\n` +
					`**Reason:** ${reason}\n` +
					`**Channels Updated:** ${channelsUpdated}`
				)
			);

			await message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});

			try {
				await target.send({
					embeds: [{
						color: 0x00FF00,
						title: `🔊 Your interaction permissions have been restored in ${message.guild.name}`,
						description: `You can now attach files and embed links again in all channels.`,
						fields: [
							{
								name: 'Reason',
								value: reason,
								inline: false
							}
						],
						timestamp: new Date()
					}]
				});
			} catch (dmError) {
				console.log(`Could not send DM to user ${target.user.username}:`, dmError.message);
			}

		} catch (error) {
			console.error('Error in iunmute command:', error);
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.error} Error`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent('An error occurred while unmuting the user.')
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}
	}
};

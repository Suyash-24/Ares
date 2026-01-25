import { ContainerBuilder, MessageFlags, SeparatorSpacingSize, PermissionFlagsBits } from 'discord.js';
import { ModerationPermissions, getModerationPermissionErrors } from '../../../utils/ModerationPermissions.js';
import { parseUserInput } from '../../../utils/userParser.js';
import { formatUserDisplay } from '../../../utils/userFormatter.js';
import { parseTime, formatDuration } from '../../../utils/timeParser.js';
import EMOJIS from '../../../utils/emojis.js';
import { markCommandInvoker } from '../../../events/loggingEvents.js';
import { sendLog, LOG_EVENTS } from '../../../utils/LoggingManager.js';

const generateCaseNumber = (guildData) => {
	if (!guildData.moderation) guildData.moderation = {};
	if (!guildData.moderation.actions) guildData.moderation.actions = [];
	return guildData.moderation.actions.length + 1;
};

export default {
	name: 'imute',
	description: 'Remove a member\'s attach files & embed links permission',
	usage: 'imute <user> [time] <reason>',
	category: 'Moderation',

	async execute(message, args, client) {
		if (args.length < 2) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.error} Missing Arguments`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`Please specify a user and reason.\nUsage: \`${client.prefix}imute <user> [time] <reason>\``)
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const canUse = await ModerationPermissions.canUseCommand(message.member, 'mute', client, message.guildId);
		if (!canUse.allowed) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.error} Permission Denied`)
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
				textDisplay.setContent(`# ${EMOJIS.error} User Not Found`)
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
				textDisplay.setContent(`# ${EMOJIS.error} Cannot Mute Bot`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent('You cannot mute a bot.')
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		let duration = null;
		let reason = '';
		let reasonStartIdx = 1;

		if (args[1] && parseTime(args[1])) {
			duration = parseTime(args[1]);
			reasonStartIdx = 2;
		}

		reason = args.slice(reasonStartIdx).join(' ') || 'No reason provided';

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

			markCommandInvoker(message.guild.id, 'imute', target.id, message.author);

			await sendLog(client, message.guildId, LOG_EVENTS.MOD_IMUTE, {
				executor: message.author,
				target: target.user,
				reason: reason,
				duration: durationMs ? formatDuration(durationMs) : 'Permanent',
				userId: target.id,
				thumbnail: target.user.displayAvatarURL()
			});

			const channels = await message.guild.channels.fetch();
			let channelsUpdated = 0;

			for (const [channelId, channel] of channels) {
				if (!channel) continue;

				try {
					await channel.permissionOverwrites.edit(target.id, {
						AttachFiles: false,
						EmbedLinks: false
					});
					channelsUpdated++;
				} catch (err) {
					console.log(`Could not edit permissions in channel ${channel.name}:`, err.message);
				}
			}

			const caseNumber = generateCaseNumber(finalGuildData);
			finalGuildData.moderation.actions.push({
				caseNumber,
				type: 'imute',
				userId: target.id,
				moderator: { id: message.author.id, username: message.author.username },
				reason,
				duration,
				expiresAt: duration ? new Date(Date.now() + duration) : null,
				timestamp: new Date()
			});

			await client.db.updateOne(
				{ guildId: message.guildId },
				{ $set: finalGuildData }
			);

			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# 🔇 Member Interaction Muted`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(
					`**User:** ${formatUserDisplay(target.user)}\n` +
					`**Reason:** ${reason}\n` +
					`**Duration:** ${formatDuration(duration)}`
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
						color: 0xFFA500,
						title: `🔇 Your interaction permissions have been restricted in ${message.guild.name}`,
						description: `You can no longer attach files or embed links in any channel${duration ? ` for ${formatDuration(duration)}` : ''}.`,
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
			console.error('Error in imute command:', error);
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.error} Error`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent('An error occurred while muting the user.')
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}
	}
};

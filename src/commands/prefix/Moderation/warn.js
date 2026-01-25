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
	name: 'warn',
	description: 'Warn a user',
	usage: 'warn <user> <reason>',
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
				textDisplay.setContent(`Please specify a user and reason.\nUsage: \`${client.prefix}warn <user> <reason>\``)
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const canUse = await ModerationPermissions.canUseCommand(message.member, 'warn', client, message.guildId);
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
				textDisplay.setContent(`# ${EMOJIS.error} Cannot Warn Bot`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent('You cannot warn a bot.')
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
					warnings: []
				}
			};

			if (!finalGuildData.moderation) {
				finalGuildData.moderation = {
					supportRoles: [],
					modRoles: [],
					headmodRoles: [],
					warnings: []
				};
			}

			if (!finalGuildData.moderation.warnings) {
				finalGuildData.moderation.warnings = [];
			}

			markCommandInvoker(message.guild.id, 'warn', target.id, message.author);

			finalGuildData.moderation.warnings.push({
				userId: target.id,
				moderatorId: message.author.id,
				reason,
				timestamp: new Date()
			});

			if (!finalGuildData.moderation.actions) {
				finalGuildData.moderation.actions = [];
			}
			const caseNumber = generateCaseNumber(finalGuildData);
			finalGuildData.moderation.actions.push({
				caseNumber,
				type: 'warn',
				userId: target.id,
				moderator: { id: message.author.id, username: message.author.username },
				reason,
				timestamp: new Date()
			});

			await client.db.updateOne(
				{ guildId: message.guildId },
				{ $set: finalGuildData }
			);

			const warningCount = finalGuildData.moderation.warnings.filter(w => w.userId === target.id).length;

			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.warn || '⚠️'} User Warned`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(
					`**User:** ${formatUserDisplay(target.user)}\n` +
					`**Reason:** ${reason}`
				)
			);

			await message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});

			await sendLog(client, message.guildId, LOG_EVENTS.MOD_WARN, {
				executor: message.author,
				target: target.user,
				reason: reason,
				thumbnail: target.user.displayAvatarURL({ dynamic: true })
			});

			try {
				await target.send({
					embeds: [{
						color: 0xFFA500,
						title: `⚠️ You have been warned in ${message.guild.name}`,
						description: `You have been warned by ${message.author.username} in ${message.guild.name}.`,
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
			console.error('Error in warn command:', error);
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.error} Error`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent('An error occurred while warning the user.')
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}
	}
};

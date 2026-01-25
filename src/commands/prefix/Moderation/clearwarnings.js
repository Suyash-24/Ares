import { ContainerBuilder, MessageFlags, SeparatorSpacingSize } from 'discord.js';
import { ModerationPermissions, getModerationPermissionErrors } from '../../../utils/ModerationPermissions.js';
import { parseUserInput } from '../../../utils/userParser.js';
import { formatUserDisplay } from '../../../utils/userFormatter.js';
import EMOJIS from '../../../utils/emojis.js';
import { markCommandInvoker } from '../../../events/loggingEvents.js';
import { sendLog, LOG_EVENTS } from '../../../utils/LoggingManager.js';

export default {
	name: 'clearwarnings',
	description: 'Clear warnings for a user',
	aliases: ['clearwarn', 'cwarn'],
	usage: 'clearwarnings <user> [reason]',
	category: 'Moderation',

	async execute(message, args, client) {
		if (!args.length) {
			return message.reply({
				content: `${EMOJIS.error} Please specify a user.\nUsage: \`${client.prefix}clearwarnings <user> [reason]\``,
				allowedMentions: { repliedUser: false }
			});
		}

		const target = await parseUserInput(args[0], message.guild, client);
		if (!target) {
			return message.reply({
				content: `${EMOJIS.error} User not found.`,
				allowedMentions: { repliedUser: false }
			});
		}

		const reason = args.slice(1).join(' ') || 'No reason provided';

		const permCheck = await ModerationPermissions.validatePermission(
			message.member,
			target,
			client,
			message.guildId,
			'mod'
		);

		if (!permCheck.allowed) {
			return message.reply({
				content: `${EMOJIS.error} ${getModerationPermissionErrors[permCheck.reason]}`,
				allowedMentions: { repliedUser: false }
			});
		}

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

			const currentWarnings = finalGuildData.moderation?.warnings || [];
			const userWarningCount = currentWarnings.filter(w => w.userId === target.id).length;

			if (userWarningCount === 0) {
				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ${EMOJIS.error} No Warnings`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`${target.user.username} has no warnings to clear.`)
				);

				return message.reply({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			}

			const updatedWarnings = currentWarnings.filter(w => w.userId !== target.id);
			finalGuildData.moderation.warnings = updatedWarnings;

			markCommandInvoker(message.guild.id, 'clearwarnings', target.id, message.author);
			await client.db.updateOne(
				{ guildId: message.guildId },
				{ $set: finalGuildData }
			);

			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.success} Warnings Cleared`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(
					`**User:** ${formatUserDisplay(target.user)}\n` +
					`**Warnings Cleared:** ${userWarningCount}\n` +
					`**Reason:** ${reason}`
				)
			);

			await message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});

			await sendLog(client, message.guildId, LOG_EVENTS.MOD_CLEARWARNINGS, {
				executor: message.author,
				target: target.user,
				reason: reason,
				warningCount: userWarningCount,
				thumbnail: target.user.displayAvatarURL({ dynamic: true })
			});

		} catch (error) {
			console.error('Error in clearwarnings command:', error);
			return message.reply({
				content: `${EMOJIS.error} An error occurred while clearing warnings.`,
				allowedMentions: { repliedUser: false }
			});
		}
	}
};

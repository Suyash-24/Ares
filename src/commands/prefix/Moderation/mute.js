import { ContainerBuilder, MessageFlags, SeparatorSpacingSize } from 'discord.js';
import { ModerationPermissions, getModerationPermissionErrors } from '../../../utils/ModerationPermissions.js';
import { parseDuration, formatDuration } from '../../../utils/durationParser.js';
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
	name: 'mute',
	description: 'Timeout a user (Discord timeout)',
	usage: 'mute <user> <duration> [reason]',
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
				textDisplay.setContent(`Please specify a user and duration.\nUsage: \`${client.prefix}mute <user> <duration> [reason]\`\nDuration format: 1s, 10m, 2h, 7d`)
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
				textDisplay.setContent(`# ❌ Cannot Mute Bot`)
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

		const durationMs = parseDuration(args[1]);
		if (!durationMs) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ❌ Invalid Duration`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent('Invalid duration. Use format like: 1s, 10m, 2h, 7d (max 28d)')
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const reason = args.slice(2).join(' ') || 'No reason provided';

		const permCheck = await ModerationPermissions.validatePermission(
			message.member,
			target,
			client,
			message.guildId,
			'mod'
		);

		if (!permCheck.allowed) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ❌ Permission Denied`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(getModerationPermissionErrors[permCheck.reason])
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		if (!message.guild.members.me.permissions.has('ModerateMembers')) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ❌ Missing Permissions`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent('I don\'t have permission to timeout members.')
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		try {

			markCommandInvoker(message.guild.id, 'mute', target.id, message.author);

			await target.timeout(durationMs, reason);

			await sendLog(client, message.guildId, LOG_EVENTS.MOD_MUTE, {
				executor: message.author,
				target: target.user,
				reason: reason,
				duration: formatDuration(durationMs),
				userId: target.id,
				thumbnail: target.user.displayAvatarURL()
			});

			try {
				const guildData = await client.db.findOne({ guildId: message.guildId }) || { guildId: message.guildId, moderation: {} };
				if (!guildData.moderation) guildData.moderation = {};
					if (!guildData.moderation.actions) guildData.moderation.actions = [];

					const caseNumber = generateCaseNumber(guildData);

					guildData.moderation.actions.push({
						caseNumber,
						type: 'mute',
						userId: target.id,
						moderator: { id: message.author.id, username: message.author.username },
					reason,
					timestamp: new Date()
				});

				await client.db.updateOne(
					{ guildId: message.guildId },
					{ $set: guildData },
					{ upsert: true }
				);

				const caseNum = guildData.moderation.actions[guildData.moderation.actions.length - 1].caseNumber;
				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ${EMOJIS.mute || '🔇'} User Muted`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(
						`**User:** ${formatUserDisplay(target.user)}\n` +
						`**Duration:** ${formatDuration(durationMs)}\n` +
						`**Reason:** ${reason}`
					)
				);

				await message.reply({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			} catch (dbError) {
				console.error('Error saving mute action to database:', dbError);
			}

			try {
				await target.send({
					embeds: [{
						color: 0xFF9900,
						title: `🔇 You have been muted in ${message.guild.name}`,
						fields: [
							{
								name: 'Moderator',
								value: message.author.username,
								inline: true
							},
							{
								name: 'Duration',
								value: formatDuration(durationMs),
								inline: true
							},
							{
								name: 'Reason',
								value: reason,
								inline: false
							}
						],
						timestamp: new Date()
					}]
				});
			} catch {
				console.log('Could not send DM to user');
			}

		} catch (error) {
			console.error('Error in mute command:', error);
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

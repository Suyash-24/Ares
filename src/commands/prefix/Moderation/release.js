import { ContainerBuilder, MessageFlags, SeparatorSpacingSize } from 'discord.js';
import { ModerationPermissions, getModerationPermissionErrors } from '../../../utils/ModerationPermissions.js';
import { parseUserInput } from '../../../utils/userParser.js';
import { formatUserDisplay } from '../../../utils/userFormatter.js';
import { formatDetainMessage, getDetainMessages } from '../../../utils/detainMessageFormatter.js';
import EMOJIS from '../../../utils/emojis.js';
import detainCommand from './detain.js';
import { sendLog, LOG_EVENTS } from '../../../utils/LoggingManager.js';
import { markCommandInvoker } from '../../../events/loggingEvents.js';

export default {
	name: 'release',
	description: 'Manually release a detained user',
	usage: 'release <user> [reason]',
	category: 'Moderation',

	async execute(message, args, client) {
		if (!args.length) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ❌ Missing Arguments`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`**Usage:** \`${client.prefix}release <user> [reason]\``)
			);

			return message.channel.send({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const canUse = await ModerationPermissions.canUseCommand(message.member, 'detain', client, message.guildId);
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

			return message.channel.send({
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

			return message.channel.send({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const reason = args.slice(1).join(' ') || 'Released by moderator';

		try {
			const guildData = await client.db.findOne({ guildId: message.guildId });

			if (!guildData || !guildData.moderation?.detains) {
				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ❌ Not Detained`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`${formatUserDisplay(target.user)} is not detained.`)
				);

				return message.channel.send({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			}

			const detainRecord = guildData.moderation.detains.find(d => d.userId === target.id);

			if (!detainRecord) {
				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ❌ Not Detained`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`${formatUserDisplay(target.user)} is not detained.`)
				);

				return message.channel.send({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			}

			const member = await message.guild.members.fetch(target.id).catch(() => null);

			if (member) {

				markCommandInvoker(message.guild.id, 'release', member.id, message.author);

				await member.roles.remove(detainRecord.detainRole).catch(() => {});

				if (detainRecord.oldRoles && detainRecord.oldRoles.length > 0) {
					await member.roles.add(detainRecord.oldRoles).catch(() => {});
				}
			}

			guildData.moderation.detains = guildData.moderation.detains.filter(
				d => !(d.userId === target.id && d.timestamp === detainRecord.timestamp)
			);
			await client.db.updateOne({ guildId: message.guildId }, guildData);

			const timerKey = `${message.guildId}_${target.id}`;
			const timerId = detainCommand.detainTimers.get(timerKey);
			if (timerId) {
				clearTimeout(timerId);
				detainCommand.detainTimers.delete(timerKey);
			}

			const messages = getDetainMessages(guildData);

			try {
				const dmMessage = formatDetainMessage(messages.release, {
					user: formatUserDisplay(target.user),
					duration: '',
					reason: reason,
					moderator: message.author.username
				});
				await target.send(dmMessage).catch(() => {});
			} catch (err) {
				console.error('Error sending DM to released user:', err);
			}

			if (guildData.moderation.detainChannel) {
				try {
					const detainChannel = message.guild.channels.cache.get(guildData.moderation.detainChannel);
					if (detainChannel && detainChannel.isTextBased()) {
						await detainChannel.send(
							`✅ **${formatUserDisplay(target.user)}** has been released from detention (manually by ${message.author.username}).\n**Reason:** ${reason}`
						).catch(() => {});
					}
				} catch (err) {
					console.error('Error sending release notification:', err);
				}
			}

			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.success || '✅'} User Released`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);

			const info = `**User:** ${formatUserDisplay(target.user)}\n**Released By:** ${message.author.username}\n**Reason:** ${reason}`;

			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(info)
			);

			await sendLog(client, message.guildId, LOG_EVENTS.MOD_RELEASE, {
				executor: message.author,
				target: target.user,
				reason: reason,
				thumbnail: target.user.displayAvatarURL({ dynamic: true })
			});

			return message.channel.send({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});

		} catch (error) {
			console.error('Error in release command:', error);
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ❌ Error`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`An error occurred: ${error.message}`)
			);

			return message.channel.send({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}
	}
};

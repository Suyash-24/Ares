import { ContainerBuilder, MessageFlags, SeparatorSpacingSize } from 'discord.js';
import { ModerationPermissions, getModerationPermissionErrors } from '../../../utils/ModerationPermissions.js';
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
	name: 'unban',
	description: 'Unban a user from the server',
	usage: 'unban <user> [reason]',
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
				textDisplay.setContent(`Please specify a user to unban.\nUsage: \`${client.prefix}unban <user> [reason]\``)
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		let targetId = args[0].replace(/[<@!>]/g, '');

		if (isNaN(targetId)) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ❌ Invalid Input`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent('Invalid user ID or mention.')
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		let targetUser;
		try {
			targetUser = await client.users.fetch(targetId);
		} catch {
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

		const reason = args.slice(1).join(' ') || 'No reason provided';

		if (!message.guild.members.me.permissions.has('BanMembers')) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ❌ Missing Permissions`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent('I don\'t have permission to unban members.')
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const permCheck = await ModerationPermissions.validatePermission(
			message.member,
			{ id: targetId, roles: { highest: { position: -1 } }, guild: message.guild },
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

		try {
			const bans = await message.guild.bans.fetch();
			const ban = bans.find(b => b.user.id === targetId);

			if (!ban) {
				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ${EMOJIS.error || '❌'} Not Banned`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent('This user is not banned.')
				);

				return message.reply({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			}

			markCommandInvoker(message.guild.id, 'unban', targetUser.id, message.author);

			await message.guild.members.unban(targetId, reason);

			let caseNum;
			try {
				const guildData = await client.db.findOne({ guildId: message.guildId }) || { guildId: message.guildId, moderation: {} };
				if (!guildData.moderation) guildData.moderation = {};
					if (!guildData.moderation.actions) guildData.moderation.actions = [];

					const caseNumber = generateCaseNumber(guildData);

					guildData.moderation.actions.push({
						caseNumber,
						type: 'unban',
						userId: targetUser.id,
						moderator: { id: message.author.id, username: message.author.username },
					reason,
					timestamp: new Date()
				});

				await client.db.updateOne(
					{ guildId: message.guildId },
					{ $set: guildData },
					{ upsert: true }
				);

				caseNum = caseNumber;
			} catch (dbError) {
				console.error('Error saving unban action to database:', dbError);
				caseNum = 'N/A';
			}
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.success || '✅'} User Unbanned`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(
					`**User:** ${formatUserDisplay(targetUser)}\n` +
					`**Reason:** ${reason}`
				)
			);

			await message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});

			await sendLog(client, message.guildId, LOG_EVENTS.MOD_UNBAN, {
				executor: message.author,
				target: targetUser,
				reason: reason,
				thumbnail: targetUser.displayAvatarURL({ dynamic: true })
			});

			try {
				await targetUser.send({
					embeds: [{
						color: 0x00FF00,
						title: `✅ You have been unbanned from ${message.guild.name}`,
						fields: [
							{
								name: 'Moderator',
								value: message.author.username,
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
			console.error('Error in unban command:', error);
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ❌ Error`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent('An error occurred while unbanning the user.')
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}
	}
};

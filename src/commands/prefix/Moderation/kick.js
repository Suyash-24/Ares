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
	name: 'kick',
	description: 'Kick a user from the server',
	usage: 'kick <user> [reason]',
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
				textDisplay.setContent(`Please specify a user to kick.\nUsage: \`${client.prefix}kick <user> [reason]\``)
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

		const reason = args.slice(1).join(' ') || 'No reason provided';

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

		if (!message.guild.members.me.permissions.has('KickMembers')) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ❌ Missing Permissions`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent('I don\'t have permission to kick members.')
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		try {

			markCommandInvoker(message.guild.id, 'kick', target.id, message.author);

			await target.kick(reason);

			try {
				const guildData = await client.db.findOne({ guildId: message.guildId }) || { guildId: message.guildId, moderation: {} };
				if (!guildData.moderation) guildData.moderation = {};
				if (!guildData.moderation.actions) guildData.moderation.actions = [];

				const caseNumber = generateCaseNumber(guildData);

				guildData.moderation.actions.push({
					caseNumber,
					type: 'kick',
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
					textDisplay.setContent(`# ${EMOJIS.kick || '👢'} User Kicked`)
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

				await sendLog(client, message.guildId, LOG_EVENTS.MOD_KICK, {
					executor: message.author,
					target: target.user,
					reason: reason,
					thumbnail: target.user.displayAvatarURL({ dynamic: true })
				});
			} catch (dbError) {
				console.error('Error saving kick action to database:', dbError);
			}

			try {
				await target.send({
					embeds: [{
						color: 0xFF0000,
						title: `👢 You have been kicked from ${message.guild.name}`,
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
			console.error('Error in kick command:', error);
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.error} Error`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent('An error occurred while kicking the user.')
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}
	}
};

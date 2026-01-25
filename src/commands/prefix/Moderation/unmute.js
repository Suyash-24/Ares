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
	name: 'unmute',
	description: 'Remove timeout from a user',
	usage: 'unmute <user> [reason]',
	category: 'Moderation',

	async execute(message, args, client) {

		let guildData = await client.db.findOne({ guildId: message.guildId })
			|| { guildId: message.guildId, moderation: {} };
		if (!guildData.moderation) guildData.moderation = {};
		if (!guildData.moderation.actions) guildData.moderation.actions = [];

		if (!args.length) {
			return message.reply({
				content: '❌ Please specify a user to unmute.\nUsage: `' + client.prefix + 'unmute <user> [reason]`',
				allowedMentions: { repliedUser: false }
			});
		}

		const target = await parseUserInput(args[0], message.guild, client);
		if (!target) {
			return message.reply({
				content: '❌ User not found.',
				allowedMentions: { repliedUser: false }
			});
		}

		if (target.user.bot) {
			return message.reply({
				content: '❌ You cannot unmute a bot.',
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
				content: `❌ ${getModerationPermissionErrors[permCheck.reason]}`,
				allowedMentions: { repliedUser: false }
			});
		}

		if (!message.guild.members.me.permissions.has('ModerateMembers')) {
			return message.reply({
				content: '❌ I don\'t have permission to modify timeouts.',
				allowedMentions: { repliedUser: false }
			});
		}

		let caseNumber = null;
		try {
			if (!target.communicationDisabledUntil || Date.now() > target.communicationDisabledUntil) {
				const container = new ContainerBuilder();
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent(`# ❌ Not Muted`)
				);
				container.addSeparatorComponents((separator) =>
					separator.setSpacing(SeparatorSpacingSize.Small)
				);
				container.addTextDisplayComponents((textDisplay) =>
					textDisplay.setContent('This user is not currently muted.')
				);

				return message.reply({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			}

			await target.timeout(null, reason);

			markCommandInvoker(message.guild.id, 'unmute', target.id, message.author);

			await sendLog(client, message.guildId, LOG_EVENTS.MOD_UNMUTE, {
				executor: message.author,
				target: target.user,
				reason: reason,
				userId: target.id,
				thumbnail: target.user.displayAvatarURL()
			});

			try {
				caseNumber = generateCaseNumber(guildData);

				guildData.moderation.actions.push({
					caseNumber,
					type: 'unmute',
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
			} catch (dbError) {
				console.error('Error saving unmute action to database:', dbError);
			}
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.unmute || '🔊'} User Unmuted`)
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

			try {
				await target.send({
					embeds: [{
						color: 0x00FF00,
						title: `🔊 Your mute has been removed in ${message.guild.name}`,
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
			console.error('Error in unmute command:', error);
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

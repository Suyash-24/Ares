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
	name: 'ban',
	description: 'Ban a user from the server',
	usage: 'ban <user> [reason]',
	category: 'Moderation',

	async execute(message, args, client) {
		if (!args.length) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.error} Missing Arguments`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`Please specify a user to ban.\nUsage: \`${client.prefix}ban <user> [reason]\``)
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

		const reason = args.slice(1).join(' ') || 'No reason provided';

		let targetMember = target;
		if (!target.roles) {

			targetMember = {
				id: target.id || target.user?.id,
				roles: { highest: { position: -1 } },
				guild: message.guild,
				user: target.user || target
			};
		}

		const permCheck = await ModerationPermissions.validatePermission(
			message.member,
			targetMember,
			client,
			message.guildId,
			'mod'
		);

		if (!permCheck.allowed) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.error} Permission Denied`)
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

		if (!message.guild.members.me.permissions.has('BanMembers')) {
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.error} Missing Permissions`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent('I don\'t have permission to ban members.')
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		try {

			const userId = target.id || target.user?.id;
			const userObj = target.user || target;

			markCommandInvoker(message.guild.id, 'ban', userId, message.author);

			await message.guild.members.ban(userId, { reason, deleteMessageSeconds: 24 * 60 * 60 });

			let caseNum;
			try {
				const guildData = await client.db.findOne({ guildId: message.guildId }) || { guildId: message.guildId, moderation: {} };
				if (!guildData.moderation) guildData.moderation = {};
				if (!guildData.moderation.actions) guildData.moderation.actions = [];

				const caseNumber = generateCaseNumber(guildData);

				guildData.moderation.actions.push({
					caseNumber,
					type: 'ban',
					userId: userId,
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
				console.error('Error saving ban action to database:', dbError);
				caseNum = 'N/A';
			}

			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.banned} User Banned`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(
					`**User:** ${formatUserDisplay(userObj)}\n` +
					`**Reason:** ${reason}`
				)
			);

			await message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});

			await sendLog(client, message.guildId, LOG_EVENTS.MOD_BAN, {
				executor: message.author,
				target: userObj,
				reason: reason,
				thumbnail: userObj.displayAvatarURL({ dynamic: true })
			});

			try {
				await userObj.send({
					embeds: [{
						color: 0xFF0000,
						title: `🔨 You have been banned from ${message.guild.name}`,
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

			}

		} catch (error) {
			console.error('Error in ban command:', error);
			const container = new ContainerBuilder();
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent(`# ${EMOJIS.error} Error`)
			);
			container.addSeparatorComponents((separator) =>
				separator.setSpacing(SeparatorSpacingSize.Small)
			);
			container.addTextDisplayComponents((textDisplay) =>
				textDisplay.setContent('An error occurred while banning the user.')
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}
	}
};

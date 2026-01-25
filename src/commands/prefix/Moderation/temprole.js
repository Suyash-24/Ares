import { ContainerBuilder, MessageFlags, SeparatorSpacingSize } from 'discord.js';
import { parseTime, formatDuration } from '../../../utils/timeParser.js';
import { scheduleTemporaryRoleRemoval } from '../../../utils/temporaryRoleManager.js';
import EMOJIS from '../../../utils/emojis.js';
import { markCommandInvoker } from '../../../events/loggingEvents.js';
import { sendLog, LOG_EVENTS } from '../../../utils/LoggingManager.js';

const buildNotice = (title, description) => {
	const container = new ContainerBuilder();
	container.addTextDisplayComponents((textDisplay) => textDisplay.setContent(title));
	container.addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Small));
	container.addTextDisplayComponents((textDisplay) => textDisplay.setContent(description));
	return container;
};

	export default {
		name: 'temprole',
		description: 'Temporarily give a role to a member',
		usage: 'temprole <member> <duration> <role>',
		category: 'Moderation',	async execute(message, args, client) {
		if (args.length < 3) {
			const container = buildNotice(
				`# ${EMOJIS.error || '❌'} Missing Arguments`,
				`Usage: \`${client.prefix}temprole <member> <duration> <role>\``
			);
			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		let targetMember;
		try {
			const memberId = args[0].replace(/[<@!>]/g, '');
			targetMember = await message.guild.members.fetch(memberId);
		} catch {
			const container = buildNotice(
				`# ${EMOJIS.error || '❌'} Member Not Found`,
				'Could not find the specified member.'
			);
			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const duration = parseTime(args[1]);
		if (!duration) {
			const container = buildNotice(
				`# ${EMOJIS.error || '❌'} Invalid Duration`,
				'Please provide a valid duration (e.g., 5m, 1h, 2d, 30s).'
			);
			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		let targetRole;
		try {
			const roleId = args[2].replace(/[<@&!>]/g, '');
			targetRole = await message.guild.roles.fetch(roleId).catch(() => null);

			if (!targetRole) {
				targetRole = message.guild.roles.cache.find(r => r.name.toLowerCase() === args.slice(2).join(' ').toLowerCase());
			}

			if (!targetRole) {
				const container = buildNotice(
					`# ${EMOJIS.error || '❌'} Role Not Found`,
					'Could not find the specified role.'
				);
				return message.reply({
					components: [container],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			}
		} catch {
			const container = buildNotice(
				`# ${EMOJIS.error || '❌'} Role Not Found`,
				'Could not find the specified role.'
			);
			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		if (targetRole.permissions.has('Administrator') || targetRole.permissions.has('ManageGuild')) {
			const container = buildNotice(
				`# ${EMOJIS.error || '❌'} Cannot Assign Role`,
				`I cannot assign roles with **Administrator** or **Manage Server** permissions. Please assign \`${targetRole.name}\` manually.`
			);
			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		if (!message.guild.members.me.permissions.has('ManageRoles')) {
			const container = buildNotice(
				`# ${EMOJIS.error || '❌'} Missing Permissions`,
				'I don\'t have permission to manage roles.'
			);
			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		if (message.guild.members.me.roles.highest.position <= targetRole.position) {
			const container = buildNotice(
				`# ${EMOJIS.error || '❌'} Role Too High`,
				'I cannot assign roles that are higher than or equal to my highest role.'
			);
			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		if (targetMember.roles.cache.has(targetRole.id)) {
			const container = buildNotice(
				`# ${EMOJIS.error || '❌'} Already Has Role`,
				`${targetMember.user.username} already has the ${targetRole.name} role.`
			);
			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		try {

			markCommandInvoker(message.guild.id, 'temprole', targetMember.id, message.author);
			await targetMember.roles.add(targetRole);

			await sendLog(client, message.guildId, LOG_EVENTS.MOD_TEMPROLE, {
				executor: message.author,
				target: targetMember.user,
				role: targetRole,
				duration: formatDuration(duration),
				userId: targetMember.id,
				roleId: targetRole.id,
				thumbnail: targetMember.user.displayAvatarURL()
			});

			const guildData = await client.db.findOne({ guildId: message.guildId }) || { guildId: message.guildId };
			if (!guildData.temporaryRoles) guildData.temporaryRoles = [];

			const tempRoleRecord = {
				guildId: message.guildId,
				userId: targetMember.id,
				roleId: targetRole.id,
				expiresAt: new Date(Date.now() + duration),
				duration,
				assignedAt: new Date(),
				assignedBy: message.author.id
			};

			guildData.temporaryRoles.push(tempRoleRecord);

			await client.db.updateOne(
				{ guildId: message.guildId },
				{ $set: guildData }
			);

			scheduleTemporaryRoleRemoval(client, tempRoleRecord);

			const container = buildNotice(
				`# ${EMOJIS.success || '✅'} Role Assigned`,
				`**Member:** ${targetMember.user.username}\n` +
				`**Role:** ${targetRole.name}\n` +
				`**Duration:** ${formatDuration(duration)}`
			);

			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});

		} catch (error) {
			console.error('Error in temprole command:', error);
			const container = buildNotice(
				`# ${EMOJIS.error || '❌'} Error`,
				'Failed to assign the role. Please try again.'
			);
			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}
	}
};

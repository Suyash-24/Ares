import { ContainerBuilder, MessageFlags, PermissionFlagsBits, SeparatorSpacingSize } from 'discord.js';
import EMOJIS from '../../../utils/emojis.js';
import { markCommandInvoker } from '../../../events/loggingEvents.js';

const buildNotice = (title, description) => {
	const container = new ContainerBuilder();
	container.addTextDisplayComponents((textDisplay) => textDisplay.setContent(title));
	container.addSeparatorComponents((separator) => separator.setSpacing(SeparatorSpacingSize.Small));
	container.addTextDisplayComponents((textDisplay) => textDisplay.setContent(description));
	return container;
};

export default {
	name: 'role',
	description: 'Toggle a role on a member (give if missing, remove if present)',
	usage: 'role <member> <role>',
	category: 'Moderation',

	async execute(message, args) {
		if (args.length < 2) {
			const container = buildNotice(
				`# ${EMOJIS.error} Missing Arguments`,
				'Usage: `role <member> <role>`'
			);
			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
			const container = buildNotice(
				`# ${EMOJIS.error} Missing Permissions`,
				'You need the **Manage Roles** permission to use this command.'
			);
			return message.reply({
				components: [container],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const targetId = args[0].replace(/[<@!>]/g, '');
		const roleInput = args.slice(1).join(' ');

		const targetMember = await message.guild.members.fetch(targetId).catch(() => null);
		if (!targetMember) {
			const container = buildNotice(
				`# ${EMOJIS.error} Member Not Found`,
				'Could not find the specified member.'
			);
			return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
		}

		const roleId = roleInput.replace(/[<@&>]/g, '');
		let role = await message.guild.roles.fetch(roleId).catch(() => null);
		if (!role) {
			role = message.guild.roles.cache.find(r => r.name.toLowerCase() === roleInput.toLowerCase());
		}

		if (!role) {
			const container = buildNotice(
				`# ${EMOJIS.error} Role Not Found`,
				'Could not find the specified role.'
			);
			return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
		}

		if (role.permissions.has('Administrator') || role.permissions.has('ManageGuild')) {
			const container = buildNotice(
				`# ${EMOJIS.error} Restricted Role`,
				`I cannot toggle roles with **Administrator** or **Manage Server** permissions. Please adjust ${role.name} manually.`
			);
			return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
		}

		const botMember = message.guild.members.me;
		if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
			const container = buildNotice(
				`# ${EMOJIS.error} Missing Permissions`,
				'I do not have permission to manage roles.'
			);
			return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
		}

		const executorHighest = message.member.roles.highest?.position ?? 0;
		const targetHighest = targetMember.roles.highest?.position ?? 0;
		const botHighest = botMember.roles.highest?.position ?? 0;

		if (message.member.id !== message.guild.ownerId && message.member.id !== targetMember.id && executorHighest <= targetHighest) {
			const container = buildNotice(
				`# ${EMOJIS.error} Higher Target`,
				'You cannot modify a member who has an equal or higher role than you.'
			);
			return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
		}

		if (botHighest <= targetHighest) {
			const container = buildNotice(
				`# ${EMOJIS.error} Bot Hierarchy`,
				'I cannot modify a member who has a higher or equal role to me.'
			);
			return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
		}

		if (botHighest <= role.position) {
			const container = buildNotice(
				`# ${EMOJIS.error} Role Too High`,
				'I cannot manage roles that are higher than or equal to my highest role.'
			);
			return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
		}

		if (executorHighest <= role.position && message.guild.ownerId !== message.member.id) {
			const container = buildNotice(
				`# ${EMOJIS.error} Role Too High`,
				'You cannot manage a role that is higher than or equal to your highest role.'
			);
			return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
		}

		if (targetMember.id === message.guild.ownerId) {
			const container = buildNotice(
				`# ${EMOJIS.error} Restricted Member`,
				'I cannot modify the server owner.'
			);
			return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
		}

		const hasRole = targetMember.roles.cache.has(role.id);

		try {
			if (hasRole) {
				markCommandInvoker(message.guild.id, 'role', targetMember.id, message.author);
				await targetMember.roles.remove(role);
				const container = buildNotice(
					`# ${EMOJIS.success} Role Removed`,
					`Removed **${role.name}** from ${targetMember.user.username}.`
				);
				return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
			} else {
				markCommandInvoker(message.guild.id, 'role', targetMember.id, message.author);
				await targetMember.roles.add(role);
				const container = buildNotice(
					`# ${EMOJIS.success} Role Added`,
					`Added **${role.name}** to ${targetMember.user.username}.`
				);
				return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
			}
		} catch (error) {
			console.error('Error toggling role:', error);
			const container = buildNotice(
				`# ${EMOJIS.error} Error`,
				'Could not modify the role. Please try again.'
			);
			return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2, allowedMentions: { repliedUser: false } });
		}
	}
};

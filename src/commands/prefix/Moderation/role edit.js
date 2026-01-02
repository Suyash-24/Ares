
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

const resolveRole = (guild, input) => {
	if (!input) return null;
	const clean = input.replace(/[<@&#>]/g, '');
	let role = guild.roles.cache.get(clean);
	if (!role) {
		role = guild.roles.cache.find((r) => r.name.toLowerCase() === input.toLowerCase());
	}
	return role;
};

const formatRole = (role) => `<@&${role.id}>`;

export default {
	name: 'role edit',
	description: 'Change a role name',
	usage: 'role edit <role> <name>',
	category: 'Moderation',

	async execute(message, args) {
		if (args.length < 2) {
			return message.reply({
				components: [buildNotice(`# ${EMOJIS.error} Missing Arguments`, `Usage: \`role edit <role> <name>\``)],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
			return message.reply({
				components: [buildNotice(`# ${EMOJIS.error} Missing Permissions`, 'You need the **Manage Roles** permission.')],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const botMember = message.guild.members.me;
		if (!botMember?.permissions.has(PermissionFlagsBits.ManageRoles)) {
			return message.reply({
				components: [buildNotice(`# ${EMOJIS.error} Missing Permissions`, 'I do not have permission to manage roles.')],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const role = resolveRole(message.guild, args[0]);
		if (!role) {
			return message.reply({
				components: [buildNotice(`# ${EMOJIS.error} Role Not Found`, 'Could not find the specified role.')],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		if (role.managed) {
			return message.reply({
				components: [buildNotice(`# ${EMOJIS.error} Managed Role`, 'I cannot edit managed roles.')],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const executorHighest = message.member.roles.highest?.position ?? 0;
		const botHighest = botMember.roles.highest?.position ?? 0;

		if (role.position >= executorHighest && message.member.id !== message.guild.ownerId) {
			return message.reply({
				components: [buildNotice(`# ${EMOJIS.error} Role Too High`, 'The role must be below your highest role.')],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		if (role.position >= botHighest) {
			return message.reply({
				components: [buildNotice(`# ${EMOJIS.error} Role Too High`, 'The role must be below my highest role.')],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const newName = args.slice(1).join(' ');

		if (newName.length > 100) {
			return message.reply({
				components: [buildNotice(`# ${EMOJIS.error} Name Too Long`, 'Role name cannot exceed 100 characters.')],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const oldName = role.name;

		try {
			markCommandInvoker(message.guild.id, 'roleedit', role.id, message.author);
			await role.edit({ name: newName });
			return message.reply({
				components: [
					buildNotice(
						`# ${EMOJIS.success} Role Renamed`,
						`**Role:** ${formatRole(role)}\n**Old Name:** ${oldName}\n**New Name:** ${newName}`
					)
				],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		} catch (error) {
			return message.reply({
				components: [buildNotice(`# ${EMOJIS.error} Edit Failed`, 'An error occurred while renaming the role.')],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}
	}
};

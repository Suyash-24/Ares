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

const formatRole = (role) => `<@&${role.id}>`;

const parseColor = (colorString) => {
	if (!colorString) return null;
	const hex = colorString.startsWith('#') ? colorString : `#${colorString}`;
	return parseInt(hex.replace('#', ''), 16);
};

export default {
	name: 'role create',
	description: 'Create a role with optional color',
	usage: 'role create <name> [color]',
	category: 'Moderation',

	async execute(message, args) {
		if (!args.length) {
			return message.reply({
				components: [buildNotice(`# ${EMOJIS.error} Missing Arguments`, `Usage: \`role create <name> [color]\``)],
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

		let roleName = args[0];
		let roleColor = null;

		if (args.length > 1) {
			roleColor = parseColor(args[1]);
			if (roleColor === null || isNaN(roleColor)) {
				return message.reply({
					components: [buildNotice(`# ${EMOJIS.error} Invalid Color`, 'Please provide a valid hex color (e.g., #FF5733 or FF5733).')],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			}
		}

		if (roleName.length > 100) {
			return message.reply({
				components: [buildNotice(`# ${EMOJIS.error} Name Too Long`, 'Role name cannot exceed 100 characters.')],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		try {
			markCommandInvoker(message.guild.id, 'rolecreate', Date.now().toString(), message.author);
			const newRole = await message.guild.roles.create({
				name: roleName,
				color: roleColor || undefined,
				reason: `Role created by ${message.author.tag}`
			});

			let description = `**Role:** ${formatRole(newRole)}\n**Name:** ${newRole.name}`;
			if (roleColor) {
				description += `\n**Color:** #${roleColor.toString(16).toUpperCase().padStart(6, '0')}`;
			}

			return message.reply({
				components: [
					buildNotice(
						`# ${EMOJIS.success} Role Created`,
						description
					)
				],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		} catch (error) {
			return message.reply({
				components: [buildNotice(`# ${EMOJIS.error} Creation Failed`, 'An error occurred while creating the role.')],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}
	}
};

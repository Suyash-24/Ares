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

const parseColor = (colorString) => {
	if (!colorString) return null;
	const hex = colorString.startsWith('#') ? colorString : `#${colorString}`;
	return parseInt(hex.replace('#', ''), 16);
};

	export default {
		name: 'role color',
		description: 'Set or remove a color for a role',
		usage: 'role color <role> [color]',
		category: 'Moderation',

		async execute(message, args) {
			if (args.length < 1) {
				return message.reply({
					components: [buildNotice(`# ${EMOJIS.error} Missing Arguments`, `Usage: \`role color <role> [color]\``)],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			}		if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles) || !message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
			return message.reply({
				components: [buildNotice(`# ${EMOJIS.error} Missing Permissions`, 'You need the **Manage Roles** and **Manage Server** permissions.')],
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

		const colorArg = args[1];
		if (!colorArg) {
			try {
				markCommandInvoker(message.guild.id, 'rolecolor', role.id, message.author);
				await role.edit({ color: 0 });
				return message.reply({
					components: [
						buildNotice(
							`# ${EMOJIS.success} Color Removed`,
							`**Role:** ${formatRole(role)}`
						)
					],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			} catch (error) {
				return message.reply({
					components: [buildNotice(`# ${EMOJIS.error} Edit Failed`, 'An error occurred while removing the role color.')],
					flags: MessageFlags.IsComponentsV2,
					allowedMentions: { repliedUser: false }
				});
			}
		}

		const color = parseColor(colorArg);
		if (color === null || isNaN(color)) {
			return message.reply({
				components: [buildNotice(`# ${EMOJIS.error} Invalid Color`, 'Please provide a valid hex color (e.g., #FF5733 or FF5733).')],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		try {
			markCommandInvoker(message.guild.id, 'rolecolor', role.id, message.author);
			await role.edit({ color });
			return message.reply({
				components: [
					buildNotice(
						`# ${EMOJIS.success} Color Updated`,
						`**Role:** ${formatRole(role)}\n**Color:** #${color.toString(16).toUpperCase().padStart(6, '0')}`
					)
				],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		} catch (error) {
			return message.reply({
				components: [buildNotice(`# ${EMOJIS.error} Edit Failed`, 'An error occurred while updating the role color.')],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}
	}
};

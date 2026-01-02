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

const resolveMember = async (guild, input) => {
	if (!input) return null;
	const clean = input.replace(/[<@!&#>]/g, '');
	let member = guild.members.cache.get(clean);
	if (!member) {
		try {
			member = await guild.members.fetch(clean);
		} catch {
			member = guild.members.cache.find((m) => m.user.username.toLowerCase() === input.toLowerCase());
		}
	}
	return member;
};

const parseColor = (input) => {
	if (!input) return null;
	const hex = input.startsWith('#') ? input : `#${input}`;
	if (!/^#[0-9a-f]{6}$/i.test(hex)) return null;
	return hex;
};

const formatRole = (role) => `<@&${role.id}>`;
const formatColor = (color) => {
	if (typeof color === 'string') return color.toUpperCase();
	if (typeof color === 'number') return `#${color.toString(16).padStart(6, '0').toUpperCase()}`;
	return 'Unknown';
};

export default {
	name: 'role topcolor',
	description: "Changes your highest role's color",
	usage: 'role topcolor <member> <hex_color>',
	category: 'Moderation',

	async execute(message, args) {
		if (args.length < 1) {
			return message.reply({
				components: [buildNotice(`# ${EMOJIS.error} Missing Arguments`, `Usage: \`role topcolor <member> [hex_color]\``)],
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

		const targetMember = await resolveMember(message.guild, args[0]);
		if (!targetMember) {
			return message.reply({
				components: [buildNotice(`# ${EMOJIS.error} Member Not Found`, 'Could not find the specified member.')],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const targetRole = targetMember.roles.highest;
		if (!targetRole) {
			return message.reply({
				components: [buildNotice(`# ${EMOJIS.error} No Role Found`, 'The member has no roles.')],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		if (targetRole.managed) {
			return message.reply({
				components: [buildNotice(`# ${EMOJIS.error} Managed Role`, 'Cannot modify managed roles.')],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const colorArg = args[1];
		if (!colorArg) {
			try {
				await targetRole.setColor(0);
				return message.reply({
					components: [
						buildNotice(
							`# ${EMOJIS.success} Color Removed`,
							`**Role:** ${formatRole(targetRole)}`
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
		if (!color) {
			return message.reply({
				components: [buildNotice(`# ${EMOJIS.error} Invalid Color`, 'Please provide a valid hex color (e.g., `#FF5733` or `FF5733`).')],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		const executorHighest = message.member.roles.highest?.position ?? 0;
		const botHighest = botMember.roles.highest?.position ?? 0;

		if (targetRole.position >= executorHighest && message.member.id !== message.guild.ownerId) {
			return message.reply({
				components: [buildNotice(`# ${EMOJIS.error} Role Too High`, 'The role must be below your highest role.')],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		if (targetRole.position >= botHighest) {
			return message.reply({
				components: [buildNotice(`# ${EMOJIS.error} Role Too High`, 'The role must be below my highest role.')],
				flags: MessageFlags.IsComponentsV2,
				allowedMentions: { repliedUser: false }
			});
		}

		try {
			markCommandInvoker(message.guild.id, 'roletopcolor', targetRole.id, message.author);
			await targetRole.setColor(color);
			return message.reply({
				components: [
					buildNotice(
						`# ${EMOJIS.success} Color Updated`,
						`**Role:** ${formatRole(targetRole)}\n**Color:** ${formatColor(color)}`
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
